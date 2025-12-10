
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { toHiragana } from '../../utils/kana';
import { levenshteinDistance } from '../../utils/string';
import { Flashcard } from '../../components/Flashcard';

interface TypingGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: () => void;
}

export const TypingGame: React.FC<TypingGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(user, !propItems);
  const items = propItems || fetchedItems;

  const [currentItem, setCurrentItem] = useState<GameItem | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [round, setRound] = useState(1);
  const MAX_ROUNDS = 10;
  
  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    setHelpSteps([
        { title: "Type Answer", description: "Type the Reading (Hiragana) OR Meaning (English).", icon: Icons.Keyboard },
        { title: "Fuzzy Match", description: "If you're close, we'll accept it but warn you about spelling.", icon: Icons.Check },
        { title: "Flashcard", description: "Upon success, the Kanji becomes clickable to view details.", icon: Icons.BookOpen }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const nextRound = () => {
    if (round > MAX_ROUNDS) {
        if (onComplete) onComplete();
        return;
    }
    
    setAnswered(false);
    setInput('');
    setFeedback('');
    
    // Weighted random selection
    const pool = items.sort(() => 0.5 - Math.random());
    const selection = pool.find(i => i.isReviewable) || pool[0];
    setCurrentItem(selection);
  };

  useEffect(() => {
    if (!loading && items.length > 0) nextRound();
  }, [loading, items]);

  const checkAnswer = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !currentItem) return;

      const attempt = input.trim();
      if (!attempt) return;

      const meanings = currentItem.subject.meanings.map(m => m.meaning.toLowerCase());
      const readings = currentItem.subject.readings?.map(r => r.reading) || [];
      
      const hiraganaAttempt = toHiragana(attempt);
      
      // Check Meaning (Exact & Fuzzy)
      const meaningExact = meanings.includes(attempt.toLowerCase());
      const meaningFuzzy = meanings.some(m => levenshteinDistance(m, attempt.toLowerCase()) <= 2);

      // Check Reading (Exact & Fuzzy on Kana)
      const readingExact = readings.includes(hiraganaAttempt);
      const readingFuzzy = readings.some(r => levenshteinDistance(r, hiraganaAttempt) <= 1);

      if (meaningExact || readingExact) {
          handleSuccess("Correct!", true);
      } else if (meaningFuzzy) {
          handleSuccess("Close enough! Watch spelling.", true);
      } else if (readingFuzzy) {
          handleSuccess(`Close! (${hiraganaAttempt})`, true);
      } else {
          // Wrong
          playSound('error', soundEnabled);
          setFeedback("Incorrect. Try again.");
          // Shake effect could go here
      }
  };

  const handleSuccess = (msg: string, isCorrect: boolean) => {
      setAnswered(true);
      setFeedback(msg);
      playSound('success', soundEnabled);
      setScore(s => s + 1);

      if (currentItem?.isReviewable && currentItem.assignment?.id) {
          waniKaniService.createReview(currentItem.assignment.id, 0, 0);
      }
  };

  const handleNext = () => {
      setRound(r => r + 1);
      nextRound();
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  
  if (round > MAX_ROUNDS) return (
     <div className="max-w-md mx-auto p-8 text-center mt-20">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Practice Complete!</h2>
        <p className="text-xl text-gray-600 mb-8">Score: {score} / {MAX_ROUNDS}</p>
        <div className="flex justify-center gap-4">
            <Button onClick={() => { setRound(1); setScore(0); nextRound(); }}>Play Again</Button>
            {!propItems && <Button variant="outline" onClick={() => navigate('/session/games')}>Back to Menu</Button>}
        </div>
     </div>
  );

  if (!currentItem) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
            {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
        </div>
        <div className="font-bold text-gray-500">Round {round} / {MAX_ROUNDS}</div>
      </div>

      <div className="text-center mb-8">
         <div 
            onClick={() => answered && setShowFlashcard(true)}
            className={`text-7xl font-bold mb-6 inline-block transition-all ${answered ? 'text-indigo-600 cursor-pointer scale-110' : 'text-gray-900'}`}
         >
            {currentItem.subject.characters || "?"}
         </div>
         
         <div className={`h-8 text-lg font-medium transition-opacity ${answered ? 'opacity-100 text-gray-600' : 'opacity-0'}`}>
            {currentItem.subject.meanings[0].meaning} • {currentItem.subject.readings?.[0]?.reading}
         </div>
      </div>

      <div className="max-w-sm mx-auto">
          <form onSubmit={checkAnswer} className="relative">
              <input 
                 type="text" 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 disabled={answered}
                 placeholder="Type meaning or reading..."
                 className={`
                    w-full px-4 py-4 text-center text-xl border-2 rounded-xl outline-none transition-all shadow-sm
                    ${answered 
                        ? 'border-green-500 bg-green-50 text-green-800' 
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                    }
                 `}
                 autoFocus
              />
              <div className={`mt-3 text-center font-bold h-6 ${feedback.includes('Incorrect') ? 'text-red-500' : 'text-green-600'}`}>
                  {feedback}
              </div>

              {answered && (
                  <div className="mt-6 flex justify-center animate-fade-in">
                      <Button onClick={handleNext} size="lg" className="w-full">
                          Next <Icons.ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                  </div>
              )}
          </form>
      </div>

      {showFlashcard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowFlashcard(false)}>
            <div className="w-full max-w-2xl h-full flex items-center" onClick={e => e.stopPropagation()}>
                <Flashcard 
                    subject={currentItem.subject}
                    hasPrev={false}
                    hasNext={false}
                    onPrev={() => setShowFlashcard(false)}
                    onNext={() => setShowFlashcard(false)}
                />
            </div>
        </div>
      )}
    </div>
  );
};
