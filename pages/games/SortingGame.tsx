
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { playSound } from '../../utils/sound';
import { HowToPlayModal } from '../../components/HowToPlayModal';

export const MatchingGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [leftItems, setLeftItems] = useState<{char: string, id: number}[]>([]);
  const [rightItems, setRightItems] = useState<{val: string, id: number}[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  const initGame = () => {
    setSelectedLeft(null);
    setMatchedIds([]);
    if (items.length < 5) return;
    
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 5);
    const base = selected.map(s => ({
      id: s.subject.id!,
      char: s.subject.characters || '?',
      val: s.subject.meanings[0].meaning
    }));

    setLeftItems(base.map(x => ({ id: x.id, char: x.char })).sort(() => 0.5 - Math.random()));
    setRightItems(base.map(x => ({ id: x.id, val: x.val })).sort(() => 0.5 - Math.random()));
  };

  useEffect(() => {
    if (!loading && items.length >= 5) {
       initGame();
    }
  }, [items, loading]);

  useEffect(() => {
    const steps = [
        { title: "Select Item", description: "Tap a Japanese character on the left.", icon: Icons.GripVertical },
        { title: "Find Match", description: "Tap the corresponding English meaning on the right.", icon: Icons.Link },
        { title: "Clear Board", description: "Match all pairs to win!", icon: Icons.CheckCircle }
    ];
    setHelpSteps(steps);
    return () => setHelpSteps(null);
  }, []);

  const handleLeftClick = (id: number) => {
    if (matchedIds.includes(id)) return;
    setSelectedLeft(id);
    playSound('pop', soundEnabled);
  };

  const handleRightClick = (id: number) => {
    if (matchedIds.includes(id)) return;
    if (selectedLeft === null) return;

    if (selectedLeft === id) {
        setMatchedIds(prev => [...prev, id]);
        setSelectedLeft(null);
        playSound('success', soundEnabled);
    } else {
        playSound('error', soundEnabled);
        setSelectedLeft(null);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center">Not enough items to match.</div>;

  const allMatched = matchedIds.length === leftItems.length && leftItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         </div>
         <h2 className="text-xl font-bold">Matching Pairs</h2>
      </div>

      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">
           {leftItems.map((item) => {
             const isMatched = matchedIds.includes(item.id);
             const isSelected = selectedLeft === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => handleLeftClick(item.id)}
                 disabled={isMatched}
                 className={`
                   w-full h-20 flex items-center justify-center bg-white border-2 rounded-xl font-bold text-3xl shadow-sm transition-all
                   ${isMatched ? 'opacity-0 pointer-events-none' : ''}
                   ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}
                 `}
               >
                 {item.char}
               </button>
             );
           })}
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">
           {rightItems.map((item) => {
             const isMatched = matchedIds.includes(item.id);
             return (
               <button
                 key={item.id}
                 onClick={() => handleRightClick(item.id)}
                 disabled={isMatched}
                 className={`
                   w-full h-20 px-2 flex items-center justify-center rounded-xl font-medium text-sm transition-all border-2
                   ${isMatched ? 'opacity-0 pointer-events-none' : ''}
                   ${selectedLeft !== null ? 'border-gray-300 bg-white hover:bg-gray-50 cursor-pointer' : 'border-gray-200 bg-gray-50 cursor-default'}
                 `}
               >
                 {item.val}
               </button>
             );
           })}
        </div>
      </div>
      
      {allMatched && (
        <div className="mt-8 text-center animate-bounce">
           <h3 className="text-2xl font-bold text-green-600 mb-4">All Matched!</h3>
           <Button size="lg" onClick={initGame}>Next Level <Icons.ChevronRight className="ml-2" /></Button>
        </div>
      )}
    </div>
  );
};
export { MatchingGame as SortingGame };
