import { useState, useEffect, useCallback } from 'react'
import { GameItem, SubjectType } from '../types'
import { assignments, subjects } from '../services/db'
import _ from 'lodash'
import { useUser } from '../contexts/UserContext'

export const useAllSubjects = (enabled: boolean = true) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const { user } = useUser()

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

    const allAssignments = assignments.find({}, { sort: { subject_id: 1 } }).fetch()

    const kanaSubjects = subjects.find({ isKana: true }, { sort: { id: 1 } }).fetch()

    const subjectIds = _.map(allAssignments, 'subject_id')
    const relatedSubjects = subjects.find({ id: { $in: subjectIds } }, { sort: { id: 1 } }).fetch()
    const subjectMap = _.keyBy(relatedSubjects, 'id')

    const now = new Date()
    const combined: GameItem[] = kanaSubjects.map(subject => ({ subject }))

    allAssignments.forEach(a => {
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

    setItems(combined)
    setLoading(false)
  }, [user, enabled])

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
