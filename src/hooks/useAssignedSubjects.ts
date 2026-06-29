import { useState, useEffect, useCallback } from 'react'
import type { GameItem } from '../core/types'
import { assignments, subjects } from '../core/db'
import { gameItemsToLearn } from '../core/db/gameItems'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'

export const useAssignedSubjects = () => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const { availableSubjects, gameLevelMin, gameLevelMax, studyCollectionIds } = useSettings()

  const runQuery = useCallback(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const combined = gameItemsToLearn({
      subjectTypes: availableSubjects,
      gameLevelMin,
      gameLevelMax,
      collectionIds: studyCollectionIds,
      includeKana: true,
    })

    setItems(combined)
    setLoading(false)
  }, [user, availableSubjects, gameLevelMin, gameLevelMax, studyCollectionIds])

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
