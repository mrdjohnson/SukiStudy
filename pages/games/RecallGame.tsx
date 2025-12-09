
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { playSound } from '../../utils/sound';
import { toHiragana } from '../../utils/kana';
import { Flashcard } from '../../components/Flashcard';

interface RecallGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: () => void;
}

export const RecallGame: React.FC<RecallGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading: fetchLoading } = useLearnedSubjects(user, !propItems);
  const items = propItems || fetchedItems;
  const loading = propItems ? false : fetchLoading;

  const [startChar, setStartChar] = useState('');
  const [possibleWords, setPossibleWords] = useState<Subject[]>([]);
  const [foundWords, setFoundWords] = useState<number[]>([]);
  const [revealedHints, setRevealedHints] = useState<Subject[]>([]);
  const [input, setInput] = useState('');
  const [finished, setFinished] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    setHelpSteps([
        { title: "Start Character", description: "You are given a starting Hiragana character.", icon: Icons.FileQuestion },
        { title: "Recall Words", description: "Type as many learned words as you can that start with that character. Press Enter on empty input to finish.", icon: Icons.Brain },
        { title: "Hints", description: "Stuck? Use the hint button to reveal a Kanji.", icon: Icons.Lightbulb }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const initGame = () => {
    setFoundWords([]);
    setRevealedHints([]);
    setFinished(false);
    setInput('');
    setSelectedSubject(null);

    const vocab = items.filter(i => i.subject.object === 'vocabulary');
    if (vocab.length === 0) return;

    // Pick random start char from available vocab
    const randomItem = vocab[Math.floor(Math.random() * vocab.length)];
    const reading = randomItem.subject.readings?.[0]?.reading;
    if (!reading) {
        // Retry if something is malformed
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
    if (!loading && items.length > 0 && possibleWords.length === 0) initGame();
  }, [items, loading]);

  useEffect(() => {
      if (possibleWords.length > 0 && foundWords.length === possibleWords.length) {
          setTimeout(finishGame, 500);
      }
  }, [foundWords, possibleWords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finished) return;

    if (input.trim() === '') {
        finishGame();
        return;
    }

    const val = toHiragana(input).trim();
    const match = possibleWords.find(w => w.readings?.[0]?.reading === val);

    if (match) {
        if (!foundWords.includes(match.id!)) {
            setFoundWords(prev => [...prev, match.id!]);
            playSound('success', soundEnabled);
            setInput('');
        } else {
            // Already found
            playSound('pop', soundEnabled);
            setInput('');
        }
    } else {
        playSound('error', soundEnabled);
    }
  };

  const handleHint = () => {
      const available = possibleWords.filter(w => !foundWords.includes(w.id!) && !revealedHints.some(h => h.id === w.id));
      if (available.length > 0) {
          const hint = available[Math.floor(Math.random() * available.length)];
          setRevealedHints(prev => [...prev, hint]);
          playSound('pop', soundEnabled);
      }
  };

  const finishGame = () => {
      setFinished(true);
      if (onComplete) {
          // Add a slight delay if used in a lesson flow
          setTimeout(onComplete, 3000);
      }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length === 0) return <div className="p-8 text-center text-gray-500">Not enough vocabulary items.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
        </div>
        <h2 className="text-xl font-bold">Word Recall</h2>
      </div>

      <div className="text-center mb-8">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Words starting with</div>
          <div className="text-6xl font-bold text-indigo-600 mb-6">{startChar}</div>
          
          {!finished ? (
              <div className="max-w-md mx-auto">
                  <form onSubmit={handleSubmit} className="relative mb-4">
                      <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type reading..."
                        className="w-full px-4 py-3 text-center text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none"
                        autoFocus
                      />
                  </form>
                  
                  <div className="flex items-center justify-between text-gray-500 text-sm mb-6 px-2">
                      <span>Found {foundWords.length} / {possibleWords.length}</span>
                      <div className="flex gap-2">
                          <button 
                             type="button" 
                             onClick={handleHint} 
                             className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                             disabled={foundWords.length + revealedHints.length >= possibleWords.length}
                          >
                             <Icons.Lightbulb className="w-4 h-4" /> Hint
                          </button>
                      </div>
                  </div>

                  {revealedHints.length > 0 && (
                      <div className="mb-6 flex flex-wrap justify-center gap-2">
                          {revealedHints.map(h => (
                              <div key={h.id} className="px-3 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm font-bold animate-fade-in">
                                  {h.characters}
                              </div>
                          ))}
                      </div>
                  )}

                  <div className="mt-6">
                      <Button onClick={finishGame} variant="secondary">I'm Done</Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Press Enter with empty input to finish</p>
              </div>
          ) : (
              <div className="bg-gray-50 p-6 rounded-2xl animate-fade-in">
                  <h3 className="text-lg font-bold mb-4">Results: {foundWords.length} / {possibleWords.length}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                      {possibleWords.map(w => {
                          const isFound = foundWords.includes(w.id!);
                          return (
                              <button 
                                key={w.id}
                                onClick={() => setSelectedSubject(w)}
                                className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center justify-center transition-all ${isFound ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-400 opacity-60'}`}
                              >
                                  <span className="text-lg mb-1">{w.characters}</span>
                                  <span className="font-normal text-xs">{w.readings?.[0]?.reading}</span>
                                  {!isFound && <span className="text-[10px] text-red-400 font-bold uppercase mt-1">Missed</span>}
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
                    flipped
                />
            </div>
        </div>
      )}
    </div>
  );
};
