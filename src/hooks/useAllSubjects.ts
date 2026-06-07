import { useState, useEffect, useCallback } from 'react'
import type { GameItem } from '../core/types'
import { assignments, subjects } from '../core/db'
import { allGameItems } from '../core/db/gameItems'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'

export const useAllSubjects = (enabled: boolean = true) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const { user } = useUser()
  const { availableSubjects, gameLevelMin, gameLevelMax } = useSettings()

  const runQuery = useCallback(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    const combined = allGameItems({
      subjectTypes: availableSubjects,
      gameLevelMin,
      gameLevelMax,
    })

    setItems(combined)
    setLoading(false)
  }, [user, enabled, availableSubjects, gameLevelMin, gameLevelMax])

  useEffect(() => {
    runQuery()

    assignments.on('changed', runQuery)
    subjects.on('changed', runQuery)

    return () => {
      assignments.off('changed', runQuery)
      subjects.off('changed', runQuery)
    }
  }, [runQuery])

  return { items, loading: enabled && loading }
}
