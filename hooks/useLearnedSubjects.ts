
import { useState, useEffect } from 'react';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';

export const useLearnedSubjects = (user: User | null) => {
  const [items, setItems] = useState<{subject: Subject, assignment: Assignment}[]>([]);
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
            assignmentMap.set(a.data.subject_id, a.data);
            subjectIds.push(a.data.subject_id);
        });

        // Batch fetch subjects (chunking if necessary, but WK API handles up to 1000 usually ok, or we assume small set for mini-games)
        const subjectsCol = await waniKaniService.getSubjects(subjectIds.slice(0, 100)); // Limit to latest 100 learned for performance in games
        
        if (subjectsCol && subjectsCol.data) {
          const combined = subjectsCol.data.map(s => ({
            subject: { ...s.data, id: s.id, object: s.object, url: s.url },
            assignment: assignmentMap.get(s.id)!
          }));
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
