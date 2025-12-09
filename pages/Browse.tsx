
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/Flashcard';

export const Browse: React.FC<{ user: User }> = ({ user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{subject: Subject, assignment?: Assignment} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const subjectsCol = await waniKaniService.getLevelSubjects(user.level);
        // Safety check for data array
        const subjects = (subjectsCol?.data || []).map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
        
        // Fetch assignments for these subjects
        const subjectIds = subjects.map(s => s.id!).filter(Boolean);
        
        let assignments: Record<number, Assignment> = {};
        
        if (subjectIds.length > 0) {
          const assignmentsCol = await waniKaniService.getAssignments(subjectIds);
          if (assignmentsCol && assignmentsCol.data) {
             assignments = assignmentsCol.data.reduce((acc, curr) => {
              acc[curr.data.subject_id] = curr.data;
              return acc;
            }, {} as Record<number, Assignment>);
          }
        }

        setItems(subjects.map(s => ({
          subject: s,
          assignment: s.id ? assignments[s.id] : undefined
        })));

      } catch (err) {
        console.error("Browse Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getSRSColor = (stage?: number) => {
    if (stage === undefined) return 'bg-gray-100 border-gray-200 text-gray-400';
    if (stage === 0) return 'bg-gray-100 border-gray-200';
    if (stage < 5) return 'bg-pink-100 border-pink-200 text-pink-700'; // Apprentice
    if (stage < 7) return 'bg-purple-100 border-purple-200 text-purple-700'; // Guru
    if (stage === 7) return 'bg-blue-100 border-blue-200 text-blue-700'; // Master
    if (stage === 8) return 'bg-sky-100 border-sky-200 text-sky-700'; // Enlightened
    return 'bg-yellow-100 border-yellow-200 text-yellow-700'; // Burned
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold text-gray-900">Level {user?.level} Content</h2>
         <Button variant="outline" size="sm" onClick={() => navigate('/')}>
           Back to Dashboard
         </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {items.map(({subject, assignment}) => (
          <button 
            key={subject.id}
            onClick={() => setSelectedItem({subject, assignment})}
            className={`
              aspect-square rounded-xl p-2 flex flex-col items-center justify-center border-2 transition-all hover:scale-105
              ${getSRSColor(assignment?.srs_stage)}
            `}
          >
            <div className="text-3xl font-bold mb-1">
              {subject.characters || (
                <div className="w-8 h-8">
                   {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                     <img src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url} alt="" className="w-full h-full opacity-80" />
                   )}
                </div>
              )}
            </div>
            <div className="text-xs truncate max-w-full font-medium opacity-80">
              {subject.meanings?.[0]?.meaning}
            </div>
          </button>
        ))}
      </div>

      {/* Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <Flashcard 
               subject={selectedItem.subject}
               assignment={selectedItem.assignment}
               hasPrev={false}
               hasNext={false}
               onPrev={() => setSelectedItem(null)}
               onNext={() => setSelectedItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
