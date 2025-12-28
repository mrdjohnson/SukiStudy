import { useState, useEffect, useCallback } from 'react'
import { GameItem, Subject, SubjectType } from '../types'
import { assignments, subjects } from '../services/db'
import { useUser } from '../contexts/UserContext'
import { generateKanaGameItems } from '../utils/kana'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'

export const useLearnedSubjects = (enabled: boolean = true, gameId?: string) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isGuest } = useUser()
  const { gameLevelMin, gameLevelMax, availableSubjects, disabledSubjects, getGameSettings } =
    useSettings()

  const runQuery = useCallback(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }

    // GUEST MODE
    if (isGuest) {
      setItems(generateKanaGameItems(true, true))
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    // Query assignments locally
    // Filter: SRS Stage > 0 (Learned)
    const learnedAssignments = assignments
      .find({ srs_stage: { $gt: 0 } }, { sort: { available_at: 1 } })
      .fetch()

    if (learnedAssignments.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const learnedSubjectIds = learnedAssignments.map(a => a.subject_id)

    let subjectTypes = availableSubjects

    if (gameId) {
      const { hiddenSubjects = [] } = getGameSettings(gameId)

      subjectTypes = _.chain(SubjectType)
        .values()
        .without(...hiddenSubjects, ...disabledSubjects)
        .value()
    }

    // Fetch corresponding subjects
    const learnedSubjects = subjects
      .find({
        id: { $in: learnedSubjectIds },
        object: { $in: subjectTypes },
        level: { $gte: gameLevelMin, $lte: gameLevelMax },
      })
      .fetch()

    const subjectMap = new Map<number, Subject>()
    learnedSubjects.forEach(s => subjectMap.set(s.id, s))

    const now = new Date()
    const combined: GameItem[] = []

    learnedAssignments.forEach(a => {
      const sub = subjectMap.get(a.subject_id)
      if (sub) {
        const availableAt = a.available_at ? new Date(a.available_at) : new Date(8640000000000000)
        combined.push({
          subject: sub,
          assignment: a,
          isReviewable: availableAt < now,
        })
      }
    })

    const includeHirigana = subjectTypes.includes(SubjectType.HIRAGANA)
    const includeKatakana = subjectTypes.includes(SubjectType.HIRAGANA)
    combined.push(...generateKanaGameItems(includeHirigana, includeKatakana))

    // Sort: Reviewable first
    combined.sort((a, b) => {
      if (a.isReviewable && !b.isReviewable) return -1
      if (!a.isReviewable && b.isReviewable) return 1
      return 0
    })

    setItems(combined)
    setLoading(false)
  }, [user, enabled, availableSubjects, getGameSettings, gameId])

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

  return { items, loading: enabled && loading }
}
