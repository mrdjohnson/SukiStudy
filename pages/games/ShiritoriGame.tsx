

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { toHiragana } from '../../utils/kana';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';

export const ShiritoriGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentWord, setCurrentWord] = useState<{subject: Subject, assignment?: any} | null>(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Subject[]>([]);
  const [message, setMessage] = useState('Type the reading in Hiragana');
  const [gameOver, setGameOver] = useState(false);
  
  const { soundEnabled } = useSettings();
  const navigate = useNavigate();

  // Filter vocab only
  const vocabItems = useMemo(() => 
    items.filter(i => i.subject.object === 'vocabulary')
  , [items]);

  const getEndingChar = (reading: string): string => {
    if (!reading) return '';
    let char = reading.slice(-1);
    if (char === 'ー' && reading.length > 1) {
       char = reading.slice(-2, -1);
    }
    const smallMap: Record<string, string> = {
      'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
      'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ'
    };
    return smallMap[char] || char;
  };

  const initGame = () => {
    setHistory([]);
    setGameOver(false);
    setMessage('Type the reading in Hiragana');
    setInput('');
    
    if (vocabItems.length === 0) return;

    // Optimization: Build map for speed
    const startsWithMap = new Map<string, typeof vocabItems>();
    vocabItems.forEach(item => {
      const reading = item.subject.readings?.[0]?.reading;
      if (!reading) return;
      const firstChar = reading.charAt(0);
      if (!startsWithMap.has(firstChar)) startsWithMap.set(firstChar, []);
      startsWithMap.get(firstChar)?.push(item);
    });

    // Check chain logic
    const checkChain = (current: Subject, used: Set<number>, depth: number): boolean => {
      if (depth >= 4) return true;
      const reading = current.readings?.[0]?.reading;
      if (!reading) return false;
      const lastChar = getEndingChar(reading);
      if (lastChar === 'ん') return false; 

      const candidates = startsWithMap.get(lastChar) || [];
      const validCandidates = candidates.filter(c => !used.has(c.subject.id!));
      const shuffled = [...validCandidates].sort(() => 0.5 - Math.random());

      for (const next of shuffled) {
        const newUsed = new Set(used);
        newUsed.add(next.subject.id!);
        if (checkChain(next.subject, newUsed, depth + 1)) return true;
      }
      return false;
    };

    // Find start word (prioritize reviews if they form a chain)
    const shuffled = [...vocabItems].sort((a, b) => {
        if (a.isReviewable && !b.isReviewable) return -1;
        return 0.5 - Math.random();
    });

    let startItem = null;
    for (const item of shuffled) {
        if (checkChain(item.subject, new Set([item.subject.id!]), 1)) {
            startItem = item;
            break;
        }
    }

    if (startItem) {
      setCurrentWord(startItem);
      setHistory([startItem.subject]);
    } else {
        setGameOver(true);
        setMessage("Not enough vocabulary chains found.");
    }
  };

  useEffect(() => {
    if (!loading && vocabItems.length > 0) {
        initGame();
    }
  }, [loading, vocabItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || gameOver) return;

    const readings = currentWord.subject.readings?.map(r => r.reading) || [];
    const normalizedInput = toHiragana(input).trim();

    if (!readings.includes(normalizedInput)) {
      setMessage("Incorrect reading. Try again.");
      playSound('error', soundEnabled);
      return;
    }

    // Correct! Submit review if applicable
    playSound('success', soundEnabled);
    if (currentWord.assignment && (currentWord as any).isReviewable && currentWord.assignment.id) {
       waniKaniService.createReview(currentWord.assignment.id, 0, 0);
    }

    const lastChar = getEndingChar(normalizedInput);
    
    // Find next
    const candidates = vocabItems.filter(v => {
      const reading = v.subject.readings?.[0]?.reading;
      if (!reading) return false;
      const firstChar = reading.charAt(0);
      return firstChar === lastChar && !history.find(h => h.id === v.subject.id);
    });

    if (candidates.length === 0) {
      setGameOver(true);
      setMessage(`Chain broken! No learned words found starting with "${lastChar}"`);
      return;
    }

    // Pick next (prioritize review)
    candidates.sort((a, b) => (a.isReviewable ? -1 : 1));
    const nextItem = candidates[0]; // Or random from top few?
    
    setCurrentWord(nextItem);
    setHistory(h => [...h, nextItem.subject]);
    setInput('');
    setMessage(`Good! Next word starts with ${lastChar}`);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (vocabItems.length < 4) return <div className="p-8 text-center text-gray-500">Not enough vocabulary to play Shiritori.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Shiritori ({history.length} Links)</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center mb-8">
         {!gameOver && currentWord ? (
            <>
              <div className="text-gray-400 text-sm mb-2">Current Word</div>
              <div className="text-5xl font-bold text-gray-900 mb-4">{currentWord.subject.characters}</div>
              <div className="text-indigo-600 font-medium">{currentWord.subject.meanings[0].meaning}</div>
              {(currentWord as any).isReviewable && (
                   <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded">Review Item</span>
              )}
            </>
         ) : (
            <div>
               <Icons.Link className="w-16 h-16 mx-auto text-gray-300 mb-4" />
               <h3 className="text-2xl font-bold text-gray-900">{gameOver ? "Chain Broken!" : "Ready"}</h3>
               <p className="text-gray-500">You connected {history.length} words.</p>
               <Button className="mt-4" onClick={initGame}>Try Again</Button>
            </div>
         )}
      </div>

      {!gameOver && (
        <form onSubmit={handleSubmit} className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type reading (romaji auto-converts)"
            className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-lg text-center font-bold shadow-sm"
            autoFocus
          />
          <p className="text-center mt-3 text-sm text-gray-500 flex items-center justify-center gap-2">
            {message === 'Incorrect reading. Try again.' ? <Icons.X className="w-4 h-4 text-red-500" /> : <Icons.Sparkles className="w-4 h-4 text-yellow-500" />}
            {message}
          </p>
        </form>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Chain History</h3>
        <div className="flex flex-wrap gap-2">
           {history.slice(0, -1).reverse().map((w, i) => (
             <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
               {w.characters}
             </span>
           ))}
        </div>
      </div>
    </div>
  );
};