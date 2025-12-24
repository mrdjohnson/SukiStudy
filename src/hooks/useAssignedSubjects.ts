import { useState, useEffect, useCallback } from 'react'
import { GameItem } from '../types'
import { assignments, subjects } from '../services/db'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'
import moment from 'moment'

export const useAssignedSubjects = () => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isGuest } = useUser()
  const { availableSubjects, getGameSettings } = useSettings()

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

    // Query assignments locally
    // Filter: SRS Stage > 0 (Learned)
    const allAssignmentsToLearn = assignments
      .find({ srs_stage: { $eq: 0 } }, { sort: { unlocked_at: 1 } })
      .fetch()

    const assignmentsToLearn = allAssignmentsToLearn.filter(
      assignment => assignment.unlocked_at && moment(assignment.unlocked_at).isBefore(moment()),
    )

    if (assignmentsToLearn.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const learnedSubjectIds = assignmentsToLearn.map(a => a.subject_id)

    // Fetch corresponding subjects
    const subjectsToLearn = subjects
      .find({
        id: { $in: learnedSubjectIds },
        object: { $in: availableSubjects },
      })
      .fetch()

    const subjectMap = _.keyBy(subjectsToLearn, 'id')

    const combined: GameItem[] = []

    assignmentsToLearn.forEach(assignment => {
      const subject = subjectMap[assignment.subject_id]

      if (subject) {
        combined.push({
          subject,
          assignment,
        })
      }
    })

    setItems(combined)
    setLoading(false)
  }, [user, availableSubjects, getGameSettings])

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
