

import { useState, useEffect } from 'react';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';

export const useLearnedSubjects = (user: User | null) => {
  const [items, setItems] = useState<{subject: Subject, assignment: Assignment, isReviewable: boolean}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch learned assignments (SRS > 0)
        // We fetch current level and maybe level - 1 to ensure enough items
        const levels = [user.level];
        if (user.level > 1) levels.push(user.level - 1);
        if (user.level > 2) levels.push(user.level - 2);

        const assignmentsCol = await waniKaniService.getAssignments([], levels, [1,2,3,4,5,6,7,8,9]);
        
        if (!assignmentsCol.data || assignmentsCol.data.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Extract Subject IDs
        const assignmentMap = new Map<number, Assignment>();
        const subjectIds: number[] = [];
        assignmentsCol.data.forEach(a => {
            assignmentMap.set(a.data.subject_id, { ...a.data, id: a.id });
            subjectIds.push(a.data.subject_id);
        });

        // Batch fetch subjects (chunking if necessary, but WK API handles up to 1000 usually ok)
        const subjectsCol = await waniKaniService.getSubjects(subjectIds.slice(0, 100)); // Limit to latest 100 learned for performance in games
        
        if (subjectsCol && subjectsCol.data) {
          const now = new Date();
          const combined = subjectsCol.data.map(s => {
            const assignment = assignmentMap.get(s.id)!;
            const availableAt = assignment.available_at ? new Date(assignment.available_at) : new Date(8640000000000000);
            return {
              subject: { ...s.data, id: s.id, object: s.object, url: s.url },
              assignment: assignment,
              isReviewable: availableAt < now
            };
          });

          // Sort: Reviewable first, then random
          combined.sort((a, b) => {
            if (a.isReviewable && !b.isReviewable) return -1;
            if (!a.isReviewable && b.isReviewable) return 1;
            return 0.5 - Math.random();
          });

          setItems(combined);
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error("Failed to load learned items", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  return { items, loading };
};