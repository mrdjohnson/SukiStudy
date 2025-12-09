
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/Flashcard';

export const Session: React.FC<{ mode: 'lesson' | 'review', user: User }> = ({ mode, user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [drillDownStack, setDrillDownStack] = useState<Subject[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessionData = async () => {
      setLoading(true);
      setDrillDownStack([]);
      setCurrentIndex(0);
      setComplete(false);
      try {
        // Fetch subjects
        const collection = await waniKaniService.getLevelSubjects(user?.level || 1);
        // Safety check for empty collection
        let subjects = (collection?.data || []).map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
        
        // Fetch assignments for context
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

        // Filter/Sort logic (Simplified)
        let sessionItems = subjects.map(s => ({
          subject: s,
          assignment: s.id ? assignments[s.id] : undefined
        }));

        if (mode === 'review') {
           sessionItems = sessionItems.sort(() => Math.random() - 0.5);
        }

        setItems(sessionItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchSessionData();
  }, [mode, user]);

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setDrillDownStack([]); 
    } else {
      setComplete(true);
    }
  };

  const handlePrev = () => {
    if (drillDownStack.length > 0) {
      setDrillDownStack(prev => prev.slice(0, -1));
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDrillDown = (s: Subject) => {
    setDrillDownStack(prev => [...prev, s]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setDrillDownStack([]);
    } else {
      setDrillDownStack(drillDownStack.slice(0, index + 1));
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Loading session data...</p>
    </div>
  );

  if (complete) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-fade-in">
       <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
         <Icons.CheckCircle className="w-12 h-12" />
       </div>
       <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h2>
       <p className="text-gray-500 mb-8 max-w-md">You've reviewed {items.length} items. Great job keeping up with your studies.</p>
       <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
       <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
         <Icons.BookOpen className="w-10 h-10" />
       </div>
       <h2 className="text-xl font-bold text-gray-900 mb-2">No items found</h2>
       <p className="text-gray-500 mb-6">There are no items available for this session type.</p>
       <Button variant="outline" onClick={() => navigate('/')}>Go Back</Button>
    </div>
  );

  // Determine active subject
  const currentItem = items[currentIndex];
  const activeSubject = drillDownStack.length > 0 ? drillDownStack[drillDownStack.length - 1] : currentItem.subject;
  const activeAssignment = drillDownStack.length > 0 ? undefined : currentItem.assignment; 
  const isDrillDown = drillDownStack.length > 0;
  
  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      
      {/* Navigation / Breadcrumbs */}
      <div className="mb-8">
        {!isDrillDown ? (
          <>
            <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
              <span>{mode === 'review' ? 'Review Session' : 'Lessons'}</span>
              <span>{currentIndex + 1} / {items.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </>
        ) : (
          <div className="flex items-center flex-wrap gap-2 text-sm">
             <button 
               onClick={() => handleBreadcrumbClick(-1)}
               className="text-indigo-600 font-medium hover:underline flex items-center"
             >
               <Icons.Layers className="w-3 h-3 mr-1" />
               Session
             </button>
             {drillDownStack?.map((s, idx) => (
               <React.Fragment key={s.id || idx}>
                 <Icons.ChevronRight className="w-3 h-3 text-gray-400" />
                 <button 
                   onClick={() => handleBreadcrumbClick(idx)}
                   className={`hover:underline flex items-center ${idx === drillDownStack.length - 1 ? 'font-bold text-gray-800 pointer-events-none' : 'text-indigo-600 font-medium'}`}
                 >
                   {s.characters || s.meanings?.[0]?.meaning}
                 </button>
               </React.Fragment>
             ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <Flashcard 
          subject={activeSubject} 
          assignment={activeAssignment}
          onNext={isDrillDown ? undefined : handleNext}
          onPrev={handlePrev}
          hasPrev={isDrillDown || currentIndex > 0}
          hasNext={!isDrillDown}
          onDrillDown={handleDrillDown}
        />
      </div>
    </div>
  );
};
