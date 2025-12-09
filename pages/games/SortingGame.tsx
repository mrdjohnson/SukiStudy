
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

export const SortingGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [pairs, setPairs] = useState<{char: string, val: string, id: number}[]>([]);
  const [rightOrder, setRightOrder] = useState<string[]>([]); // Current state of right side
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || items.length < 5) return;
    // Pick 5
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 5);
    const p = selected.map(s => ({
      id: s.subject.id!,
      char: s.subject.characters || '?',
      val: s.subject.meanings[0].meaning
    }));
    
    setPairs(p);
    // Shuffle right side
    setRightOrder(p.map(x => x.val).sort(() => 0.5 - Math.random()));
    setSolved(false);
  }, [items, loading]);

  const handleRightClick = (idx: number) => {
    if (solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      // Swap
      const newOrder = [...rightOrder];
      const temp = newOrder[selectedIdx];
      newOrder[selectedIdx] = newOrder[idx];
      newOrder[idx] = temp;
      setRightOrder(newOrder);
      setSelectedIdx(null);
      
      // Check if solved
      const isCorrect = newOrder.every((val, i) => val === pairs[i].val);
      if (isCorrect) setSolved(true);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center">Not enough items to sort.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Sort & Match</h2>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-sm text-indigo-800 flex gap-2">
         <Icons.GripVertical className="w-5 h-5" />
         Tap two items on the right list to swap them until they match the characters on the left.
      </div>

      <div className="flex gap-4">
        {/* Left Col (Fixed) */}
        <div className="flex-1 space-y-3">
           {pairs.map((p) => (
             <div key={p.id} className="h-16 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl font-bold text-2xl shadow-sm">
               {p.char}
             </div>
           ))}
        </div>

        {/* Right Col (Sortable) */}
        <div className="flex-1 space-y-3">
           {rightOrder.map((val, idx) => {
             const isCorrect = val === pairs[idx].val;
             return (
               <button
                 key={idx}
                 onClick={() => handleRightClick(idx)}
                 className={`
                   w-full h-16 px-2 flex items-center justify-center rounded-xl font-medium text-sm transition-all border-2
                   ${selectedIdx === idx ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 bg-white shadow-sm'}
                   ${solved && isCorrect ? 'border-green-500 bg-green-50 text-green-700' : ''}
                 `}
               >
                 {solved && <Icons.CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                 {val}
               </button>
             );
           })}
        </div>
      </div>
      
      {solved && (
        <div className="mt-8 text-center animate-bounce">
           <Button size="lg" onClick={() => window.location.reload()}>Next Level <Icons.ChevronRight className="ml-2" /></Button>
        </div>
      )}
    </div>
  );
};
