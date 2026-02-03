import { useEffect } from 'react'
import { syncService } from '../services/syncService'
import { User } from '../types'
import { useNetwork } from '@mantine/hooks'

const SYNC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Hook that manages syncing for both offline and online (WaniKani) data.
 * Only runs when a user is present.
 *
 * Handles:
 * - Initial sync on mount
 * - Periodic syncing (every 10 minutes)
 * - Sync on network reconnection
 */
export const useSyncManager = (user: User | null) => {
  const { online } = useNetwork()

  useEffect(() => {
    if (user && online) {
      console.log('SyncManager: Online event detected, triggering sync...')
      syncService.sync()
    }
  }, [user, online])

  useEffect(() => {
    // Don't run any sync logic if there's no user
    if (!user) return

    console.log('SyncManager: Starting sync manager for user:', user.username)

    // Initial sync
    syncService.sync()

    // Interval sync
    const interval = setInterval(() => {
      console.log('SyncManager: Running periodic sync...')
      syncService.sync()
    }, SYNC_INTERVAL_MS)

    return () => {
      console.log('SyncManager: Cleaning up sync manager')
      clearInterval(interval)
    }
  }, [user]) // Re-run if user changes (login/logout)
}
