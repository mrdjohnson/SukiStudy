import { useCallback, useState } from 'react'

/**
 * Runs async actions while tracking a single `pending` flag that stays true for
 * the full duration of the awaited work.
 *
 * Unlike React's `useTransition`, whose `isPending` does not follow an async
 * callback past its first `await`, this keeps `pending` true until the promise
 * settles. A counter is used so overlapping actions are tracked correctly —
 * `pending` only clears once the last in-flight action finishes.
 */
export const useAsyncAction = () => {
  const [pendingCount, setPendingCount] = useState(0)

  const run = useCallback((action: () => Promise<unknown>) => {
    setPendingCount(count => count + 1)

    void (async () => {
      try {
        await action()
      } finally {
        setPendingCount(count => count - 1)
      }
    })()
  }, [])

  return [pendingCount > 0, run] as const
}
