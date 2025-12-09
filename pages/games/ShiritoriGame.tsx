
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { toHiragana } from '../../utils/kana';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

export const ShiritoriGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentWord, setCurrentWord] = useState<Subject | null>(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Subject[]>([]);
  const [message, setMessage] = useState('Type the reading in Hiragana');
  const [gameOver, setGameOver] = useState(false);
  const navigate = useNavigate();

  // Filter vocab only
  const vocab = useMemo(() => 
    items
      .filter(i => i.subject.object === 'vocabulary')
      .map(i => i.subject)
  , [items]);

  // Helper to normalize ending char (e.g., small tsu -> big tsu, ignore long vowel)
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
    
    if (vocab.length === 0) return;

    // Build Adjacency Map: First char -> List of words starting with it
    const startsWithMap = new Map<string, Subject[]>();
    vocab.forEach(v => {
      const reading = v.readings?.[0]?.reading; // Hiragana
      if (!reading) return;
      const firstChar = reading.charAt(0);
      if (!startsWithMap.has(firstChar)) startsWithMap.set(firstChar, []);
      startsWithMap.get(firstChar)?.push(v);
    });

    // DFS to check if a chain of length 'targetDepth' exists
    const checkChain = (current: Subject, used: Set<number>, depth: number): boolean => {
      if (depth >= 4) return true;

      const reading = current.readings?.[0]?.reading;
      if (!reading) return false;
      
      const lastChar = getEndingChar(reading);
      if (lastChar === 'ん') return false; // Dead end 

      const candidates = startsWithMap.get(lastChar) || [];
      const validCandidates = candidates.filter(c => !used.has(c.id!));
      
      // Shuffle candidates to check random paths rather than just first found to avoid deterministic boring chains
      const shuffledCandidates = [...validCandidates].sort(() => 0.5 - Math.random());

      for (const next of shuffledCandidates) {
        const newUsed = new Set(used);
        newUsed.add(next.id!);
        if (checkChain(next, newUsed, depth + 1)) {
          return true;
        }
      }
      return false;
    };

    const findValidStart = (): Subject | null => {
      const shuffled = [...vocab].sort(() => 0.5 - Math.random());
      
      // Try to find a word with a chain of 4
      for (const startWord of shuffled) {
        if (checkChain(startWord, new Set([startWord.id!]), 1)) {
           return startWord;
        }
      }

      // If no chain of 4 for any word, say the game is not ready yet
      return  null;
    };

    const startWord = findValidStart();
    if (startWord) {
      setCurrentWord(startWord);
      setHistory([startWord]);
    } else {
        setGameOver(true);
        setMessage("Not enough vocabulary to start a chain.");
    }
  };

  useEffect(() => {
    if (!loading && vocab.length > 0) {
        initGame();
    }
  }, [loading, vocab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || gameOver) return;

    // 1. Check if input matches reading of current word
    const readings = currentWord.readings?.map(r => r.reading) || [];
    const normalizedInput = toHiragana(input).trim();

    if (!readings.includes(normalizedInput)) {
      setMessage("Incorrect reading. Try again.");
      return;
    }

    // 2. Get last char
    const lastChar = getEndingChar(normalizedInput);
    
    // 3. Find next word in user's vocab starting with lastChar
    const candidates = vocab.filter(v => {
      const reading = v.readings?.[0]?.reading;
      if (!reading) return false;
      const firstChar = reading.charAt(0);
      return firstChar === lastChar && !history.find(h => h.id === v.id);
    });

    if (candidates.length === 0) {
      setGameOver(true);
      setMessage(`Chain broken! No learned words found starting with "${lastChar}"`);
      return;
    }

    const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentWord(nextWord);
    setHistory(h => [...h, nextWord]);
    setInput('');
    setMessage(`Good! Next word starts with ${lastChar}`);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (vocab.length < 4) return <div className="p-8 text-center text-gray-500">Not enough vocabulary to play Shiritori.</div>;

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
              <div className="text-5xl font-bold text-gray-900 mb-4">{currentWord.characters}</div>
              <div className="text-indigo-600 font-medium">{currentWord.meanings[0].meaning}</div>
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


      <div className="mt-12">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Vocab Pool ({vocab.length})</h3>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
           {vocab.slice(0, 20).map((w, i) => (
             <span key={i} className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-xs">
               {w.characters}
             </span>
           ))}
           {vocab.length > 20 && <span className="text-xs text-gray-400 self-center">...</span>}
        </div>
      </div>

      {/* Chain History */}
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
