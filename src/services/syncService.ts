import moment from 'moment'
import { flush } from '../utils/flush.ts'

const SYNC_KEYS = {
  USER: 'wk_last_sync_user',
  SUBJECTS: 'wk_last_sync_subjects',
  SUBJECTS_MIGRATION: 'wk_last_sync_subjects_migration',
  ASSIGNMENTS_MIGRATION: 'wk_last_sync_assignments_migration',
  ASSIGNMENTS: 'wk_last_sync_assignments',
  MATERIALS: 'wk_last_sync_materials',
  KANA: 'wk_last_sync_kana',
}

const syncServiceWorker = new ComlinkWorker<typeof import('./syncService.worker.ts')>(
  new URL('./syncService.worker.ts', import.meta.url),
  { type: 'module' },
)

/**
 * Utility function to check if a sync should be skipped based on last sync time
 * @param syncKey - The localStorage key for this sync type
 * @param options - Configuration options
 * @returns true if sync should be skipped, false otherwise
 */
async function maybeRunSync(
  syncKey: string,
  callback: () => Promise<void>,
  options?: {
    intervalMinutes?: number
    forceSync?: boolean
    beforeDate?: string // For migration checks
    runOnce?: boolean // For one-time migrations
  },
): Promise<void> {
  const lastSync = localStorage.getItem(syncKey)
  const { intervalMinutes = 60, forceSync = false, beforeDate, runOnce = false } = options || {}

  const sync = async () => {
    console.log(`[Sync] Syncing ${syncKey}`)

    try {
      await callback()

      localStorage.setItem(syncKey, moment().toISOString())
    } catch (e) {
      console.error(`[Sync] Error syncing ${syncKey}:`, e)
    } finally {
      console.log(`[Sync] Finished syncing ${syncKey}`)
    }
  }

  // Force sync overrides all checks
  if (forceSync) {
    await sync()

    return
  }

  // For one-time operations (migrations), skip if already run
  if (runOnce && lastSync) {
    console.log(`[Sync] Skipping ${syncKey} - already run`)

    return
  }

  // For date-based migration checks
  if (beforeDate && lastSync && moment(lastSync).isBefore(moment(beforeDate))) {
    console.log(`[Sync] Forcing ${syncKey} - last sync before ${beforeDate}`)

    await sync()

    return
  }

  // Check if enough time has passed since last sync
  if (lastSync && moment().subtract(intervalMinutes, 'minutes').isBefore(moment(lastSync))) {
    console.log(`[Sync] Skipping ${syncKey} - not enough time has passed`)

    return
  }

  await sync()
}

export const syncService = {
  async offlineSync() {
    console.log('[Offline Sync] Starting synchronization...')

    try {
      await this.populateKana()

      console.log('[Offline Sync] Synchronization complete.')
    } catch (error) {
      console.error('[Offline Sync] Error during sync:', error)
    }
  },

  async sync() {
    await this.offlineSync()

    try {
      if (!navigator.onLine) {
        return
      }

      const token = localStorage.getItem('wk_token')
      if (!token || token === 'guest_token') return

      // Set the token in the worker before syncing
      await syncServiceWorker.setToken(token)

      console.log('[Sync] Starting synchronization...')

      await this.syncUser()

      await this.migrateSubjects()
      await this.syncSubjects()
      await this.migrateAssignments()
      await this.syncAssignments()
      await this.syncStudyMaterials()
      await this.syncEncounterItems()

      console.log('[Sync] Synchronization complete.')
    } catch (error) {
      console.error('[Sync] Error during sync:', error)
    } finally {
      await flush()
    }
  },

  async syncUser() {
    await maybeRunSync(SYNC_KEYS.USER, async () => {
      await syncServiceWorker.syncUser()
    })
  },

  async migrateSubjects() {
    await maybeRunSync(
      SYNC_KEYS.SUBJECTS_MIGRATION,
      async () => {
        await syncServiceWorker.migrateSubjects()
      },
      { beforeDate: '12/24/2025' },
    )
  },

  async syncSubjects(forceSync = false) {
    await maybeRunSync(
      SYNC_KEYS.SUBJECTS,
      async () => {
        const lastSync = localStorage.getItem(SYNC_KEYS.SUBJECTS)
        await syncServiceWorker.syncSubjects(lastSync)
      },
      { forceSync },
    )
  },

  async migrateAssignments() {
    await maybeRunSync(
      SYNC_KEYS.ASSIGNMENTS_MIGRATION,
      async () => {
        await syncServiceWorker.migrateAssignments()
      },
      { runOnce: true },
    )
  },

  async syncAssignments() {
    await maybeRunSync(SYNC_KEYS.ASSIGNMENTS, async () => {
      const lastSync = localStorage.getItem(SYNC_KEYS.ASSIGNMENTS)
      await syncServiceWorker.syncAssignments(lastSync)
    })
  },

  async syncStudyMaterials() {
    await maybeRunSync(SYNC_KEYS.MATERIALS, async () => {
      const lastSync = localStorage.getItem(SYNC_KEYS.MATERIALS)
      await syncServiceWorker.syncStudyMaterials(lastSync)
    })
  },

  async populateKana(forcePopulate = false) {
    await maybeRunSync(
      SYNC_KEYS.KANA,
      async () => {
        await syncServiceWorker.populateKana()

        // fixes signaldb worker bug where updates are not picked up: "not enough game items"
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      },
      { forceSync: forcePopulate, beforeDate: 'Feb 09 2026' },
    )
  },

  async syncEncounterItems() {
    await syncServiceWorker.syncEncounterItems()
  },

  async clearData() {
    await syncServiceWorker.clearData()

    localStorage.removeItem(SYNC_KEYS.SUBJECTS)
    localStorage.removeItem(SYNC_KEYS.ASSIGNMENTS)
    localStorage.removeItem(SYNC_KEYS.MATERIALS)
  },
}
