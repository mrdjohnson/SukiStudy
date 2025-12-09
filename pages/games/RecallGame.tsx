
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { playSound } from '../../utils/sound';
import { toHiragana } from '../../utils/kana';
import { Flashcard } from '../../components/Flashcard';

export const RecallGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [startChar, setStartChar] = useState('');
  const [possibleWords, setPossibleWords] = useState<Subject[]>([]);
  const [foundWords, setFoundWords] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [finished, setFinished] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    setHelpSteps([
        { title: "Start Character", description: "You are given a starting Hiragana character.", icon: Icons.FileQuestion },
        { title: "Recall Words", description: "Type as many learned words as you can that start with that character.", icon: Icons.Brain },
        { title: "See Results", description: "Finish to see all possible words you could have found.", icon: Icons.ListCheck }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const initGame = () => {
    setFoundWords([]);
    setFinished(false);
    setInput('');
    setSelectedSubject(null);

    const vocab = items.filter(i => i.subject.object === 'vocabulary');
    if (vocab.length === 0) return;

    // Pick random start char from available vocab
    const randomItem = vocab[Math.floor(Math.random() * vocab.length)];
    const reading = randomItem.subject.readings?.[0]?.reading;
    if (!reading) {
        initGame(); // Retry
        return;
    }
    const char = reading.charAt(0);
    setStartChar(char);

    // Find all matches
    const matches = vocab
        .filter(i => i.subject.readings?.[0]?.reading.startsWith(char))
        .map(i => i.subject);
    
    // Remove duplicates by ID
    const unique = Array.from(new Map(matches.map(item => [item.id, item])).values());
    setPossibleWords(unique);
  };

  useEffect(() => {
    if (!loading && items.length > 0) initGame();
  }, [items, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finished) return;

    const val = toHiragana(input).trim();
    const match = possibleWords.find(w => w.readings?.[0]?.reading === val);

    if (match) {
        if (!foundWords.includes(match.id!)) {
            setFoundWords(prev => [...prev, match.id!]);
            playSound('success', soundEnabled);
            setInput('');
        } else {
            // Already found
            setInput('');
        }
    } else {
        playSound('error', soundEnabled);
    }
  };

  const finishGame = () => {
      setFinished(true);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
        </div>
        <h2 className="text-xl font-bold">Word Recall</h2>
      </div>

      <div className="text-center mb-8">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Words starting with</div>
          <div className="text-6xl font-bold text-indigo-600 mb-6">{startChar}</div>
          
          {!finished ? (
              <form onSubmit={handleSubmit} className="relative max-w-sm mx-auto">
                  <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type reading..."
                    className="w-full px-4 py-3 text-center text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                  <div className="mt-4 text-gray-500 text-sm">
                      Found {foundWords.length} words
                  </div>
                  <div className="mt-6">
                      <Button onClick={finishGame} variant="secondary">I'm Done</Button>
                  </div>
              </form>
          ) : (
              <div className="bg-gray-50 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-4">Results: {foundWords.length} / {possibleWords.length}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                      {possibleWords.map(w => {
                          const isFound = foundWords.includes(w.id!);
                          return (
                              <button 
                                key={w.id}
                                onClick={() => setSelectedSubject(w)}
                                className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center justify-center transition-all ${isFound ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-400'}`}
                              >
                                  <span className="text-lg mb-1">{w.characters}</span>
                                  <span className="font-normal text-xs">{w.readings?.[0]?.reading}</span>
                              </button>
                          )
                      })}
                  </div>
                  <div className="mt-6">
                      <Button onClick={initGame}>Play Again</Button>
                  </div>
              </div>
          )}
      </div>

      {selectedSubject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSelectedSubject(null)}>
            <div className="w-full max-w-2xl h-full flex items-center" onClick={e => e.stopPropagation()}>
                <Flashcard 
                    subject={selectedSubject}
                    hasPrev={false}
                    hasNext={false}
                    onPrev={() => setSelectedSubject(null)}
                    onNext={() => setSelectedSubject(null)}
                />
            </div>
        </div>
      )}
    </div>
  );
};
