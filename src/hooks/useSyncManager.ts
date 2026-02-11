import { useEffect, useTransition } from 'react'
import { syncService } from '../services/syncService'
import { User } from '../types'

const SYNC_INTERVAL_MS = 60 * 60 * 1000 // 60 minutes

/**
 * Hook that manages syncing for both offline and online (WaniKani) data.
 * Only runs when a user is present.
 *
 * Handles:
 * - Initial sync on mount
 * - Periodic syncing (every 60 minutes)
 * - Sync on network reconnection
 */
export const useSyncManager = (user: User | null) => {
  const [isSyncing, startTransition] = useTransition()

  const sync = () => {
    startTransition(async () => {
      console.log('SyncManager: Running sync...')

      await syncService.sync()
    })
  }

  useEffect(() => {
    // Don't run any sync logic if there's no user or offline
    if (!user) return

    console.log('SyncManager: Starting sync manager for user:', user.username)

    // Initial sync
    sync()

    // Interval sync
    const interval = setInterval(() => {
      console.log('SyncManager: Running periodic sync...')
      sync()
    }, SYNC_INTERVAL_MS)

    return () => {
      console.log('SyncManager: Cleaning up sync manager')
      clearInterval(interval)
    }
  }, [user?.id]) // Re-run if user changes (login/logout)

  return isSyncing
}
