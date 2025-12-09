
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { HowToPlayModal } from '../../components/HowToPlayModal';

export const SortingGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [pairs, setPairs] = useState<{char: string, val: string, id: number}[]>([]);
  const [rightOrder, setRightOrder] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const initGame = () => {
    setSolved(false);
    setSelectedIdx(null);
    if (items.length < 5) return;
    
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 5);
    const p = selected.map(s => ({
      id: s.subject.id!,
      char: s.subject.characters || '?',
      val: s.subject.meanings[0].meaning
    }));
    
    setPairs(p);
    setRightOrder(p.map(x => x.val).sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    if (!loading && items.length >= 5) {
       initGame();
    }
  }, [items, loading]);

  const handleRightClick = (idx: number) => {
    if (solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      const newOrder = [...rightOrder];
      const temp = newOrder[selectedIdx];
      newOrder[selectedIdx] = newOrder[idx];
      newOrder[idx] = temp;
      setRightOrder(newOrder);
      setSelectedIdx(null);
      
      const isCorrect = newOrder.every((val, i) => val === pairs[i].val);
      if (isCorrect) setSolved(true);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center">Not enough items to sort.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
            <button onClick={() => setShowHelp(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
               <Icons.Help className="w-6 h-6" />
            </button>
         </div>
         <h2 className="text-xl font-bold">Sort & Match</h2>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-sm text-indigo-800 flex gap-2">
         <Icons.GripVertical className="w-5 h-5" />
         Tap two items on the right list to swap them until they match the characters on the left.
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
           {pairs.map((p) => (
             <div key={p.id} className="h-16 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl font-bold text-2xl shadow-sm">
               {p.char}
             </div>
           ))}
        </div>

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
           <Button size="lg" onClick={initGame}>Next Level <Icons.ChevronRight className="ml-2" /></Button>
        </div>
      )}

      <HowToPlayModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Sort & Match"
        steps={[
           { title: "Match Rows", description: "The goal is to align the meanings on the right with the characters on the left.", icon: Icons.ArrowUpDown },
           { title: "Tap to Swap", description: "Tap one item on the right list, then tap another to swap their positions.", icon: Icons.GripVertical },
           { title: "Solve It", description: "When all items are perfectly aligned and green, you win!", icon: Icons.CheckCircle }
        ]}
      />
    </div>
  );
};
