
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

interface GameCard {
  id: string; 
  subjectId: number;
  content: string;
  type: 'character' | 'meaning' | 'reading';
  isFlipped: boolean;
  isMatched: boolean;
  subjectType: string;
}

export const MemoryGame: React.FC<{ user: User }> = ({ user }) => {
  const { items: learnedItems, loading: dataLoading } = useLearnedSubjects(user);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(300);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (dataLoading) return;
    if (learnedItems.length < 6) {
        setLoading(false);
        return; 
    }
    
    // Pick 6 random subjects
    const selected = [...learnedItems].sort(() => 0.5 - Math.random()).slice(0, 6);
    
    const gameCards: GameCard[] = [];
    
    selected.forEach(({ subject: s }) => {
      const sType = s.object || 'vocabulary';
      
      let charContent = s.characters;
      if (!charContent && s.character_images) {
        const svg = s.character_images.find(i => i.content_type === 'image/svg+xml');
        charContent = svg ? svg.url : '?';
      }

      gameCards.push({
        id: `${s.id}-char`,
        subjectId: s.id!,
        content: charContent || '?',
        type: 'character',
        isFlipped: false,
        isMatched: false,
        subjectType: sType
      });

      let pairType: 'meaning' | 'reading' = 'meaning';
      if (sType !== 'radical') {
        pairType = Math.random() > 0.5 ? 'reading' : 'meaning';
      }
      
      let pairContent = "";
      if (pairType === 'meaning') {
        pairContent = s.meanings.find(m => m.primary)?.meaning || s.meanings[0].meaning;
      } else {
         pairContent = s.readings?.find(r => r.primary)?.reading || s.readings?.[0]?.reading || "?";
      }

      gameCards.push({
        id: `${s.id}-pair`,
        subjectId: s.id!,
        content: pairContent,
        type: pairType,
        isFlipped: false,
        isMatched: false,
        subjectType: sType
      });
    });

    setCards(gameCards.sort(() => 0.5 - Math.random()));
    setLoading(false);
    setTimer(300);
  }, [learnedItems, dataLoading]);

  // Timer
  useEffect(() => {
    if (loading || gameOver || won) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, gameOver, won]);

  const handleCardClick = (index: number) => {
    if (gameOver || won || loading) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedIndices.length >= 2) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];
      const card1 = cards[idx1];
      const card2 = cards[idx2];

      if (card1.subjectId === card2.subjectId) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          
          const newMatchCount = matches + 1;
          setMatches(newMatchCount);
          if (newMatchCount === cards.length / 2) {
            setWon(true);
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[idx1].isFlipped = false;
          resetCards[idx2].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || dataLoading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  if (learnedItems.length < 6) return <div className="p-8 text-center text-gray-500">Not enough learned items to play. Start some lessons!</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
            Memory Match
         </h2>
         <div className="text-xl font-mono font-bold text-gray-700">
             {formatTime(timer)}
         </div>
      </div>

      {!gameOver && !won ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
             <div 
               key={card.id}
               onClick={() => handleCardClick(idx)}
               className={`aspect-[3/4] rounded-xl cursor-pointer perspective-1000 transition-all duration-300 ${card.isMatched ? 'opacity-50 grayscale pointer-events-none' : ''}`}
             >
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${card.isFlipped ? 'rotate-y-180' : ''}`}>
                   <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md border-2 border-indigo-400 flex items-center justify-center">
                      <Icons.Brain className="text-white/30 w-12 h-12" />
                   </div>
                   <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border-2 flex flex-col items-center justify-center p-2 text-center`}>
                      {card.content.startsWith('http') ? (
                        <img src={card.content} className="w-16 h-16 object-contain" alt="" />
                      ) : (
                        <span className={`${card.type === 'character' ? 'text-4xl font-bold' : 'text-lg font-medium'}`}>
                          {card.content}
                        </span>
                      )}
                   </div>
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">{won ? "You Won!" : "Time's Up!"}</h2>
            <Button onClick={() => window.location.reload()}>Play Again</Button>
        </div>
      )}
      <style>{`.rotate-y-180 { transform: rotateY(180deg); } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .perspective-1000 { perspective: 1000px; }`}</style>
    </div>
  );
};
