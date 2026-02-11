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
function shouldSkipSync(
  syncKey: string,
  options?: {
    intervalMinutes?: number
    forceSync?: boolean
    beforeDate?: string // For migration checks
    runOnce?: boolean // For one-time migrations
  },
): boolean {
  const lastSync = localStorage.getItem(syncKey)
  const { intervalMinutes = 10, forceSync = false, beforeDate, runOnce = false } = options || {}

  // Force sync overrides all checks
  if (forceSync) {
    return false
  }

  // For one-time operations (migrations), skip if already run
  if (runOnce && lastSync) {
    return true
  }

  // For date-based migration checks
  if (beforeDate) {
    if (!lastSync) return false

    return moment(lastSync).isAfter(moment(beforeDate))
  }

  // Check if enough time has passed since last sync
  if (lastSync && moment().subtract(intervalMinutes, 'minutes').isBefore(moment(lastSync))) {
    return true
  }

  return false
}

/**
 * Update the sync timestamp for a given key
 */
function updateSyncTimestamp(syncKey: string): void {
  localStorage.setItem(syncKey, moment().toISOString())
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
    if (shouldSkipSync(SYNC_KEYS.USER)) {
      return
    }

    await syncServiceWorker.syncUser()

    updateSyncTimestamp(SYNC_KEYS.USER)
  },

  async migrateSubjects() {
    if (shouldSkipSync(SYNC_KEYS.SUBJECTS_MIGRATION, { beforeDate: '12/24/2025' })) {
      return
    }

    await syncServiceWorker.migrateSubjects()

    updateSyncTimestamp(SYNC_KEYS.SUBJECTS_MIGRATION)
  },

  async syncSubjects(forceSync = false) {
    if (shouldSkipSync(SYNC_KEYS.SUBJECTS, { forceSync })) {
      return
    }

    const lastSync = localStorage.getItem(SYNC_KEYS.SUBJECTS)
    await syncServiceWorker.syncSubjects(lastSync)

    updateSyncTimestamp(SYNC_KEYS.SUBJECTS)
  },

  async migrateAssignments() {
    if (shouldSkipSync(SYNC_KEYS.ASSIGNMENTS_MIGRATION, { runOnce: true })) {
      return
    }

    await syncServiceWorker.migrateAssignments()
    updateSyncTimestamp(SYNC_KEYS.ASSIGNMENTS_MIGRATION)
  },

  async syncAssignments() {
    if (shouldSkipSync(SYNC_KEYS.ASSIGNMENTS)) {
      return
    }

    const lastSync = localStorage.getItem(SYNC_KEYS.ASSIGNMENTS)
    await syncServiceWorker.syncAssignments(lastSync)

    updateSyncTimestamp(SYNC_KEYS.ASSIGNMENTS)
  },

  async syncStudyMaterials() {
    if (shouldSkipSync(SYNC_KEYS.MATERIALS)) {
      return
    }

    const lastSync = localStorage.getItem(SYNC_KEYS.MATERIALS)
    await syncServiceWorker.syncStudyMaterials(lastSync)

    updateSyncTimestamp(SYNC_KEYS.MATERIALS)
  },

  async populateKana(forcePopulate = false) {
    if (shouldSkipSync(SYNC_KEYS.KANA, { runOnce: true, forceSync: forcePopulate })) {
      return
    }

    await syncServiceWorker.populateKana()

    // fixes signaldb worker bug where updates are not picked up: "not enough game items"
    if (typeof window !== 'undefined') {
      window.location.reload()
    }

    updateSyncTimestamp(SYNC_KEYS.KANA)
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
