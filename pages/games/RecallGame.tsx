
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem } from '../../types';
import { useAllSubjects } from '../../hooks/useAllSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../contexts/SettingsContext';
import { playSound } from '../../utils/sound';
import { toHiragana } from '../../utils/kana';
import { GameResults } from '../../components/GameResults';
import { openFlashcardModal } from '../../components/modals/FlashcardModal';

interface RecallGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: (data?: any) => void;
}

export const RecallGame: React.FC<RecallGameProps> = ({ user, items: propItems, onComplete }) => {
    const { items: fetchedItems, loading } = useAllSubjects(user, !propItems);
    const items = propItems || fetchedItems;

    const [startChar, setStartChar] = useState('');
    const [possibleWords, setPossibleWords] = useState<Subject[]>([]);
    const [foundWords, setFoundWords] = useState<number[]>([]);
    const [revealedHints, setRevealedHints] = useState<Subject[]>([]);
    const [input, setInput] = useState('');
    const [finished, setFinished] = useState(false);
    const [highlightIds, setHighlightIds] = useState<number[]>([]);
    const startTimeRef = useRef(Date.now());

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
        setHighlightIds([]);
        startTimeRef.current = Date.now();

        const vocab = items.filter(i => i.subject.object === 'vocabulary');
        if (vocab.length === 0) return;

        // Pick random start char from available vocab
        const randomItem = vocab[Math.floor(Math.random() * vocab.length)];
        const reading = randomItem.subject.readings?.[0]?.reading;
        if (!reading) return;
        
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
        
        // Find ALL words matching this reading
        const matches = possibleWords.filter(w => w.readings?.some(r => r.reading === val));

        if (matches.length > 0) {
            // Check which are new
            const newIds: number[] = [];
            const alreadyIds: number[] = [];
            
            matches.forEach(m => {
                if (!foundWords.includes(m.id!)) {
                    newIds.push(m.id!);
                } else {
                    alreadyIds.push(m.id!);
                }
            });

            if (newIds.length > 0) {
                setFoundWords(prev => [...prev, ...newIds]);
                playSound('success', soundEnabled);
                setInput('');
            } else {
                // All matching words already found -> trigger highlight
                setHighlightIds(alreadyIds);
                playSound('pop', soundEnabled);
                setInput('');
                setTimeout(() => setHighlightIds([]), 1000);
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
    };

    const handleResultsNext = () => {
        if (onComplete) {
            const history = possibleWords.map(w => ({
                subject: w,
                correct: foundWords.includes(w.id!)
            }));
            onComplete({
                gameId: 'recall',
                score: foundWords.length,
                maxScore: possibleWords.length,
                timeTaken: (Date.now() - startTimeRef.current) / 1000,
                history: history
            });
        }
    }

    if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
    if (items.length === 0) return <div className="p-8 text-center text-gray-500">Not enough vocabulary items.</div>;

    if (finished) {
        const history = possibleWords.map(w => ({
            subject: w,
            correct: foundWords.includes(w.id!)
        }));
        
        return (
            <GameResults 
                gameId="recall"
                score={foundWords.length}
                maxScore={possibleWords.length}
                timeTaken={(Date.now() - startTimeRef.current) / 1000}
                history={history}
                onNext={handleResultsNext}
                isLastGame={!propItems}
            />
        );
    }

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
                    
                        {/* Live Found List */}
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {foundWords.map(id => {
                            const w = possibleWords.find(p => p.id === id);
                            if(!w) return null;
                            const isHighlight = highlightIds.includes(id);
                            return (
                                <button 
                                    key={id}
                                    onClick={() => openFlashcardModal(w)}
                                    className={`px-3 py-1 rounded-lg text-sm font-bold transition-all duration-300 ${isHighlight ? 'bg-yellow-300 text-yellow-900 scale-110' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                >
                                    {w.characters}
                                </button>
                            )
                        })}
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
            </div>
        </div>
    );
};
