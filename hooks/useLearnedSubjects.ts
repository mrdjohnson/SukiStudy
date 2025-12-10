import { useState, useEffect, useCallback } from 'react';
import { User, GameItem, Subject } from '../types';
import { assignments, subjects } from '../services/db';

export const useLearnedSubjects = (user: User | null, enabled: boolean = true) => {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  const runQuery = useCallback(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Query assignments locally
    // Filter: SRS Stage > 0 (Learned)
    const learnedAssignments = assignments.find(
      { srs_stage: { $gt: 0 } },
      { sort: { available_at: 1 } }
    ).fetch();

    if (learnedAssignments.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const learnedSubjectIds = learnedAssignments.map(a => a.subject_id);
    
    // Fetch corresponding subjects
    const learnedSubjects = subjects.find({ id: { $in: learnedSubjectIds } }).fetch();
    
    const subjectMap = new Map<number, Subject>();
    learnedSubjects.forEach(s => subjectMap.set(s.id, s));
    
    const now = new Date();
    const combined: GameItem[] = [];
    
    learnedAssignments.forEach(a => {
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

    // Sort: Reviewable first
    combined.sort((a, b) => {
        if (a.isReviewable && !b.isReviewable) return -1;
        if (!a.isReviewable && b.isReviewable) return 1;
        return 0; 
    });

    setItems(combined);
    setLoading(false);
  }, [user, enabled]);

  useEffect(() => {
    runQuery();

    
    assignments.on('changed', runQuery);
    subjects.on('changed', runQuery);

    return () => {
      // assignments.dispose()
      // subjects.dispose()

      assignments.off('changed', runQuery);
      subjects.off('changed', runQuery);
    };
  }, [runQuery]);

  return { items, loading: enabled && loading };
};