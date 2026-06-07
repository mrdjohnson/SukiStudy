import { useState, useEffect, useCallback } from 'react'
import type { GameItem } from '../core/types'
import { assignments, subjects } from '../core/db'
import { gameItemsToLearn } from '../core/db/gameItems'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'

export const useAssignedSubjects = () => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isGuest } = useUser()
  const { availableSubjects, gameLevelMin, gameLevelMax } = useSettings()

  const runQuery = useCallback(() => {
    // GUEST MODE
    if (isGuest) {
      // todo, set up kana items to learn in the future
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    const combined = gameItemsToLearn({
      subjectTypes: availableSubjects,
      gameLevelMin,
      gameLevelMax,
    })

    setItems(combined)
    setLoading(false)
  }, [user, isGuest, availableSubjects, gameLevelMin, gameLevelMax])

  useEffect(() => {
    runQuery()

    assignments.on('changed', runQuery)
    subjects.on('changed', runQuery)

    return () => {
      // assignments.dispose()
      // subjects.dispose()

      assignments.off('changed', runQuery)
      subjects.off('changed', runQuery)
    }
  }, [runQuery])

  return { items, loading }
}
