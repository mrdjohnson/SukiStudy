import { useState, useEffect, useCallback } from 'react'
import type { GameItem } from '../core/types'
import { assignments, subjects } from '../core/db'
import { availableGameItems } from '../core/db/gameItems'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'

type LearnedSubjectOptions = {
  collectionIds?: string[]
}

export const useLearnedSubjects = (
  enabled: boolean = true,
  gameId?: string,
  options: LearnedSubjectOptions = {},
) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const {
    gameLevelMin,
    gameLevelMax,
    availableSubjects,
    disabledSubjects,
    getGameSettings,
    studyCollectionIds,
  } = useSettings()
  const collectionIds = options.collectionIds ?? studyCollectionIds

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

    let subjectTypes = availableSubjects

    if (gameId) {
      const { hiddenSubjects = [] } = getGameSettings(gameId)

      subjectTypes = _.chain(availableSubjects)
        .without(...hiddenSubjects)
        .without(...disabledSubjects)
        .value()
    }

    const combined = availableGameItems({
      subjectTypes,
      gameLevelMin,
      gameLevelMax,
      collectionIds,
    })

    setItems(combined)
    setLoading(false)
  }, [
    user,
    enabled,
    availableSubjects,
    disabledSubjects,
    getGameSettings,
    gameId,
    gameLevelMin,
    gameLevelMax,
    collectionIds,
  ])

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
