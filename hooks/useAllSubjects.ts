import { useState, useEffect, useCallback } from 'react';
import { User, GameItem, Subject } from '../types';
import { assignments, subjects } from '../services/db';

export const useAllSubjects = (user: User | null, enabled: boolean = true) => {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  const runQuery = useCallback(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    const allAssignments = assignments.find({}).fetch();
    
    if (allAssignments.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const subjectIds = allAssignments.map(a => a.subject_id);
    const relatedSubjects = subjects.find({ id: { $in: subjectIds } }).fetch();
    const subjectMap = new Map<number, Subject>(relatedSubjects.map(s => [s.id, s]));

    const now = new Date();
    const combined: GameItem[] = [];

    allAssignments.forEach(a => {
        const sub = subjectMap.get(a.subject_id);
        if (sub) {
            const availableAt = a.available_at ? new Date(a.available_at) : new Date(8640000000000000);
            combined.push({
                subject: sub,
                assignment: a,
                isReviewable: availableAt < now
            });
        }
    });

    setItems(combined);
    setLoading(false);
  }, [user, enabled]);

  useEffect(() => {
    runQuery();
    
    const stop1 = assignments.on('change', runQuery);
    const stop2 = subjects.on('change', runQuery);

    return () => {
      stop1();
      stop2();
    };
  }, [runQuery]);

  return { items, loading: enabled && loading };
};