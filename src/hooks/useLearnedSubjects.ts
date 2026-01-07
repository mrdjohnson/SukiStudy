import { useState, useEffect, useCallback } from 'react'
import { GameItem, Subject, SubjectType } from '../types'
import { assignments, subjects } from '../services/db'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'

export const useLearnedSubjects = (enabled: boolean = true, gameId?: string) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const { gameLevelMin, gameLevelMax, availableSubjects, disabledSubjects, getGameSettings } =
    useSettings()

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

    // Query assignments locally
    // Filter: SRS Stage > 0 (Learned)
    const learnedAssignments = assignments
      .find({ srs_stage: { $gt: 0 } }, { sort: { available_at: 1 } })
      .fetch()

    const learnedSubjectIds = learnedAssignments.map(a => a.subject_id)

    let subjectTypes = availableSubjects

    if (gameId) {
      const { hiddenSubjects = [] } = getGameSettings(gameId)

      subjectTypes = _.chain(availableSubjects)
        .without(...hiddenSubjects)
        .without(...disabledSubjects)
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

    const kanaSubjectTypes = _.intersection(subjectTypes, [
      SubjectType.HIRAGANA,
      SubjectType.KATAKANA,
    ])

    let kanaSubjects: Subject[] = []

    if (!_.isEmpty(kanaSubjectTypes)) {
      kanaSubjects = subjects
        .find({
          object: { $in: kanaSubjectTypes },
          level: { $gte: gameLevelMin, $lte: gameLevelMax },
        })
        .fetch()
    }

    const subjectMap = _.keyBy(learnedSubjects, 'id')

    const now = new Date()
    const combined: GameItem[] = kanaSubjects.map(subject => ({ subject }))

    learnedAssignments.forEach(a => {
      const sub = subjectMap[a.subject_id]

      if (sub) {
        const availableAt = a.available_at ? new Date(a.available_at) : new Date(8640000000000000)
        combined.push({
          subject: sub,
          assignment: a,
          isReviewable: availableAt < now,
        })
      }
    })

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
      assignments.off('changed', runQuery)
      subjects.off('changed', runQuery)
    }
  }, [runQuery])

  return { items, loading: enabled && loading }
}
