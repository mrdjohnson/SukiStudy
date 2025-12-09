
import React, { useState, useEffect } from 'react';
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
  const vocab = items.filter(i => i.subject.object === 'vocabulary').map(i => i.subject);

  useEffect(() => {
    if (loading || vocab.length === 0) return;
    // Start with random word
    const start = vocab[Math.floor(Math.random() * vocab.length)];
    setCurrentWord(start);
    setHistory([start]);
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || gameOver) return;

    // 1. Check if input matches reading of current word
    const readings = currentWord.readings?.map(r => r.reading) || [];
    const normalizedInput = toHiragana(input).trim(); // Basic conversion

    if (!readings.includes(normalizedInput)) {
      setMessage("Incorrect reading. Try again.");
      return;
    }

    // 2. Get last char
    const lastChar = normalizedInput.slice(-1);
    
    // 3. Find next word in user's vocab starting with lastChar
    // Note: 'ー' implies vowel extension, usually we look at previous char, but simpler to just match exact char for now or ignore 'ー'
    const nextChar = lastChar === 'ー' ? normalizedInput.slice(-2, -1) : lastChar;
    
    const candidates = vocab.filter(v => {
      const reading = v.readings?.[0]?.reading;
      return reading && reading.startsWith(nextChar) && !history.find(h => h.id === v.id);
    });

    if (candidates.length === 0) {
      setGameOver(true);
      setMessage("Chain broken! No words found starting with " + nextChar);
      return;
    }

    const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentWord(nextWord);
    setHistory(h => [...h, nextWord]);
    setInput('');
    setMessage(`Good! Next word starts with ${nextChar}`);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (vocab.length < 10) return <div className="p-8 text-center">Not enough vocabulary to play Shiritori.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Shiritori ({history.length} Links)</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center mb-8">
         {!gameOver ? (
            <>
              <div className="text-gray-400 text-sm mb-2">Current Word</div>
              <div className="text-5xl font-bold text-gray-900 mb-4">{currentWord?.characters}</div>
              <div className="text-indigo-600 font-medium">{currentWord?.meanings[0].meaning}</div>
            </>
         ) : (
            <div>
               <Icons.Link className="w-16 h-16 mx-auto text-gray-300 mb-4" />
               <h3 className="text-2xl font-bold text-gray-900">Chain Broken!</h3>
               <p className="text-gray-500">You connected {history.length} words.</p>
               <Button className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
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
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Vocab Options</h3>
        <div className="flex flex-wrap gap-2">
           {vocab.map((w, i) => (
             <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
               {w.characters}
             </span>
           ))}
        </div>
      </div>

      {/* Chain History */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Chain History</h3>
        <div className="flex flex-wrap gap-2">
           {history.slice(0, -1).reverse().map((w, i) => (
             <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
               {w.characters}
             </span>
           ))}
        </div>
      </div>
    </div>
  );
};
