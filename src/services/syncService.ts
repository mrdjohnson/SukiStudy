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
  {},
)

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

    if (!navigator.onLine) {
      return
    }

    const token = localStorage.getItem('wk_token')
    if (!token) return

    // Set the token in the worker before syncing
    await syncServiceWorker.setToken(token)

    console.log('[Sync] Starting synchronization...')

    try {
      await this.syncUser()

      await this.migrateSubjects()
      await this.syncSubjects()
      await this.migrateAssignments()
      await this.syncAssignments()
      await this.syncStudyMaterials()

      console.log('[Sync] Synchronization complete.')
    } catch (error) {
      console.error('[Sync] Error during sync:', error)
    } finally {
      await flush()
    }
  },

  async syncUser() {
    const lastUserSync = localStorage.getItem(SYNC_KEYS.USER)
    const userStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastUserSync))) {
      return
    }

    await syncServiceWorker.syncUser()

    localStorage.setItem(SYNC_KEYS.USER, userStart)
  },

  async migrateSubjects() {
    const lastSubjectMigration = localStorage.getItem(SYNC_KEYS.SUBJECTS_MIGRATION)
    const subjectsStart = new Date().toISOString()

    if (moment(lastSubjectMigration).isBefore(moment('12/24/2025'))) {
      return
    }

    await syncServiceWorker.migrateSubjects()

    localStorage.setItem(SYNC_KEYS.SUBJECTS_MIGRATION, subjectsStart)
  },

  async syncSubjects(forceSync = false) {
    const lastSubjectSync = localStorage.getItem(SYNC_KEYS.SUBJECTS)
    const subjectsStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastSubjectSync)) && !forceSync) {
      return
    }

    await syncServiceWorker.syncSubjects(lastSubjectSync)

    localStorage.setItem(SYNC_KEYS.SUBJECTS, subjectsStart)
  },

  async migrateAssignments() {
    const lastAssignMigration = localStorage.getItem(SYNC_KEYS.ASSIGNMENTS_MIGRATION)
    const assignStart = new Date().toISOString()

    if (lastAssignMigration) {
      return
    }

    await syncServiceWorker.migrateAssignments()

    localStorage.setItem(SYNC_KEYS.ASSIGNMENTS_MIGRATION, assignStart)
  },

  async syncAssignments() {
    const lastAssignSync = localStorage.getItem(SYNC_KEYS.ASSIGNMENTS)
    const assignStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastAssignSync))) {
      return
    }

    await syncServiceWorker.syncAssignments(lastAssignSync)

    localStorage.setItem(SYNC_KEYS.ASSIGNMENTS, assignStart)
  },

  async syncStudyMaterials() {
    const lastMatSync = localStorage.getItem(SYNC_KEYS.MATERIALS)
    const matStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastMatSync))) {
      return
    }

    await syncServiceWorker.syncStudyMaterials(lastMatSync)

    localStorage.setItem(SYNC_KEYS.MATERIALS, matStart)
  },

  async populateKana(forcePopulate = false) {
    const lastKanaSync = localStorage.getItem(SYNC_KEYS.KANA)
    const kanaStart = new Date().toISOString()

    if (lastKanaSync && !forcePopulate) {
      return
    }

    await syncServiceWorker.populateKana()

    localStorage.setItem(SYNC_KEYS.KANA, kanaStart)
  },

  async clearData() {
    await syncServiceWorker.clearData()

    localStorage.removeItem(SYNC_KEYS.SUBJECTS)
    localStorage.removeItem(SYNC_KEYS.ASSIGNMENTS)
    localStorage.removeItem(SYNC_KEYS.MATERIALS)
  },
}
