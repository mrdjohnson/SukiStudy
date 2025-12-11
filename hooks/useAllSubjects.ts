import { useState, useEffect, useCallback } from 'react'
import { User, GameItem, Subject } from '../types'
import { assignments, subjects } from '../services/db'
import _ from 'lodash'
import { useUser } from '../contexts/UserContext'
import { generateKanaGameItems } from '../utils/kana'

export const useAllSubjects = (enabled: boolean = true) => {
  const [items, setItems] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const { user, isGuest } = useUser()

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

    const allAssignments = assignments.find({}).fetch()

    if (allAssignments.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const subjectIds = allAssignments.map(a => a.subject_id)
    const relatedSubjects = subjects.find({ id: { $in: subjectIds } }).fetch()
    const subjectMap = _.keyBy(relatedSubjects, 'id')

    const now = new Date()
    const combined: GameItem[] = []

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
