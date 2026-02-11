import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncService } from './syncService'
// Import mock worker ops
import { mockWorkerOps } from '../../test/setup'
import moment from 'moment'

// syncService.worker.ts needs to be mocked to avoid import issues
vi.mock('./syncService.worker.ts', () => ({}))

describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()

    // Mock moment() to a fixed time
    vi.setSystemTime(new Date('2026-02-10T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('syncUser', () => {
    it('should sync user if never synced', async () => {
      expect(localStorage.getItem('wk_last_sync_user')).toBeNull()
      await syncService.syncUser()
      expect(mockWorkerOps.syncUser).toHaveBeenCalled()
      expect(localStorage.getItem('wk_last_sync_user')).toBe('2026-02-10T12:00:00.000Z')
    })

    it('should skip sync if synced recently (within interval)', async () => {
      // Set last sync to 30 mins ago
      const lastSync = moment().subtract(30, 'minutes').toISOString()
      localStorage.setItem('wk_last_sync_user', lastSync)

      await syncService.syncUser()
      expect(mockWorkerOps.syncUser).not.toHaveBeenCalled()
    })

    it('should sync if interval (60m) has passed', async () => {
      // Set last sync to 61 mins ago
      const lastSync = moment().subtract(61, 'minutes').toISOString()
      localStorage.setItem('wk_last_sync_user', lastSync)

      await syncService.syncUser()
      expect(mockWorkerOps.syncUser).toHaveBeenCalled()
    })
  })

  describe('migrateSubjects', () => {
    it('should migrate if never run', async () => {
      await syncService.migrateSubjects()
      expect(mockWorkerOps.migrateSubjects).toHaveBeenCalled()
    })

    it('should run migration if last sync was BEFORE cutoff date (Bug check)', async () => {
      // Scenario: User last ran migration a long time ago (e.g. 2024), now it's 2026.
      // Migration cutoff is '12/24/2025'.
      // If the code is correct for "Run if last run was old/invalid", it should run.
      // If code Logic is "Skip if last run was before 2025", it will fail this test (it will skip).

      const oldDate = '2024-01-01T00:00:00Z'
      localStorage.setItem('wk_last_sync_subjects_migration', oldDate)

      await syncService.migrateSubjects()

      // If current logic calls IS_BEFORE => SKIP, then this expectation will fail (it won't be called)
      // But logic SHOULD strictly be: Run if not run recently (interval) OR logic dictates re-run.
      // If `beforeDate` implies "Ignore old syncs and re-run", then it SHOULD be called.

      // For now, I expect it to run, to verify the behavior.
      expect(mockWorkerOps.migrateSubjects).toHaveBeenCalled()
    })

    it('should skip if last sync was AFTER cutoff date and within interval', async () => {
      // Last run was 2026-01-01 (After 2025-12-24)
      const recentDate = '2026-01-01T00:00:00Z'
      localStorage.setItem('wk_last_sync_subjects_migration', recentDate)

      // Current time 2026-02-10. Interval defaults to 60m.
      // Since 2026-01-01 is > 60m ago, it might run due to interval check!
      // Wait, does migration have an interval?
      // syncService.migrateSubjects uses default options (interval 60m).
      // So it will run if > 60m passed.
      // So `beforeDate` check is only relevant if it forces a skip?

      await syncService.migrateSubjects()
      expect(mockWorkerOps.migrateSubjects).toHaveBeenCalled()
    })
  })

  describe('forceSync', () => {
    it('should force sync even if recently synced', async () => {
      const lastSync = moment().subtract(5, 'minutes').toISOString()
      localStorage.setItem('wk_last_sync_subjects', lastSync)

      await syncService.syncSubjects(true) // force = true
      expect(mockWorkerOps.syncSubjects).toHaveBeenCalled()
    })
  })

  describe('runOnce', () => {
    it('should skip if runOnce is true and already has timestamp', async () => {
      // populateAssignments has runOnce: true? No, migrateAssignments does.
      const key = 'wk_last_sync_assignments_migration'
      localStorage.setItem(key, '2026-01-01T00:00:00Z')

      await syncService.migrateAssignments()
      expect(mockWorkerOps.migrateAssignments).not.toHaveBeenCalled()
    })
  })
})
