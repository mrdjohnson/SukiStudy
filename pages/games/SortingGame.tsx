
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { playSound } from '../../utils/sound';
import { HowToPlayModal } from '../../components/HowToPlayModal';

interface MatchingGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: () => void;
}

export const MatchingGame: React.FC<MatchingGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading: fetchLoading } = useLearnedSubjects(user, !propItems);
  const items = propItems || fetchedItems;
  const loading = propItems ? false : fetchLoading;

  const [leftItems, setLeftItems] = useState<{char: string, id: number}[]>([]);
  const [rightItems, setRightItems] = useState<{val: string, id: number}[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  const initGame = () => {
    setSelectedId(null);
    setSelectedSide(null);
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
    if (matchedIds.length === leftItems.length && leftItems.length > 0) {
        if (onComplete) setTimeout(onComplete, 2000);
    }
  }, [matchedIds, leftItems, onComplete]);

  useEffect(() => {
    const steps = [
        { title: "Select Item", description: "Tap any item on the left or right.", icon: Icons.GripVertical },
        { title: "Find Match", description: "Tap the corresponding matching pair on the other side.", icon: Icons.Shuffle },
        { title: "Clear Board", description: "Match all pairs to win! Matched pairs stay visible but fade out.", icon: Icons.CheckCircle }
    ];
    setHelpSteps(steps);
    return () => setHelpSteps(null);
  }, []);

  const handleSelection = (id: number, side: 'left' | 'right') => {
    if (matchedIds.includes(id)) return;

    // First selection
    if (selectedId === null) {
      setSelectedId(id);
      setSelectedSide(side);
      playSound('pop', soundEnabled);
      return;
    }

    // Deselect if same item clicked
    if (selectedId === id && selectedSide === side) {
      setSelectedId(null);
      setSelectedSide(null);
      return;
    }

    // Switch selection if same side clicked
    if (selectedSide === side) {
      setSelectedId(id);
      playSound('pop', soundEnabled);
      return;
    }

    // Check match
    if (selectedId === id) {
       // Match found
       setMatchedIds(prev => [...prev, id]);
       setSelectedId(null);
       setSelectedSide(null);
       playSound('success', soundEnabled);
    } else {
       // Wrong match
       playSound('error', soundEnabled);
       setSelectedId(null);
       setSelectedSide(null);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center">Not enough items to match.</div>;

  const allMatched = matchedIds.length === leftItems.length && leftItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-2">
            {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
         </div>
         <h2 className="text-xl font-bold">Matching Pairs</h2>
      </div>

      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">
           {leftItems.map((item) => {
             const isMatched = matchedIds.includes(item.id);
             const isSelected = selectedId === item.id && selectedSide === 'left';
             return (
               <button
                 key={item.id}
                 onClick={() => handleSelection(item.id, 'left')}
                 disabled={isMatched}
                 className={`
                   w-full h-20 flex items-center justify-center bg-white border-2 rounded-xl font-bold text-3xl shadow-sm transition-all
                   ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
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
             const isSelected = selectedId === item.id && selectedSide === 'right';
             return (
               <button
                 key={item.id}
                 onClick={() => handleSelection(item.id, 'right')}
                 disabled={isMatched}
                 className={`
                   w-full h-20 px-2 flex items-center justify-center rounded-xl font-medium text-sm transition-all border-2
                   ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
                   ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 bg-gray-50 hover:bg-white'}
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
