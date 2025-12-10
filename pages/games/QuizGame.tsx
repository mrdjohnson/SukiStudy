
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { HowToPlayModal } from '../../components/HowToPlayModal';

interface QuizGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: () => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(user, !propItems);
  const items = propItems || fetchedItems;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [incorrectItems, setIncorrectItems] = useState<{subject: Subject, correctAnswer: string, type: string}[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  
  const { soundEnabled } = useSettings();
  const navigate = useNavigate();

  const initGame = () => {
    setFinished(false);
    setCurrentQuestion(0);
    setScore(0);
    setIncorrectItems([]);
    setSelectedAnswer(null);
    setFeedback(null);
    
    if (items.length < 4) return;
    
    const shuffledItems = [...items].sort(() => 0.5 - Math.random());
    const selection = shuffledItems.slice(0, 10);

    const q = selection.map((item) => {
       const type = Math.random() > 0.5 ? 'meaning' : 'reading';
       const distractors = items
         .filter(i => i.subject.id !== item.subject.id && i.subject.object === item.subject.object)
         .sort(() => 0.5 - Math.random())
         .slice(0, 3);
       
       const correctAns = type === 'meaning' 
         ? item.subject.meanings[0].meaning 
         : (item.subject.readings?.[0]?.reading || item.subject.meanings[0].meaning);
       
       const options = [item, ...distractors].map(i => {
          return type === 'meaning' 
            ? i.subject.meanings[0].meaning 
            : (i.subject.readings?.[0]?.reading || i.subject.meanings[0].meaning)
       }).sort(() => 0.5 - Math.random());

       return {
         subject: item.subject,
         assignment: item.assignment,
         isReviewable: item.isReviewable,
         type,
         correctAnswer: correctAns,
         options
       };
    });
    setQuestions(q);
  };

  useEffect(() => {
    if (!loading && items.length >= 4) {
      initGame();
    }
  }, [items, loading]);

  const handleAnswer = (ans: string) => {
    if (selectedAnswer) return;
    
    setSelectedAnswer(ans);
    const q = questions[currentQuestion];
    const isCorrect = ans === q.correctAnswer;

    if (isCorrect) {
      setScore(s => s + 1);
      setFeedback('correct');
      playSound('success', soundEnabled);
      if (q.isReviewable && q.assignment && q.assignment.id) {
         waniKaniService.createReview(q.assignment.id, 0, 0);
      }
    } else {
      setFeedback('wrong');
      playSound('error', soundEnabled);
      setIncorrectItems(prev => [...prev, { subject: q.subject, correctAnswer: q.correctAnswer, type: q.type }]);
    }

    setTimeout(() => {
        setSelectedAnswer(null);
        setFeedback(null);
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(c => c + 1);
        } else {
            setFinished(true);
            if (onComplete) setTimeout(onComplete, 1000);
        }
    }, 1500);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 4) return <div className="p-8 text-center text-gray-500">Not enough items.</div>;

  if (finished) return (
     <div className="max-w-2xl mx-auto p-8 text-center">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className="text-xl text-gray-600 mb-8">You scored {score} / {questions.length}</p>
        
        {incorrectItems.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-bold text-red-800 mb-4">Review missed items:</h3>
                <div className="space-y-3">
                    {incorrectItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-red-100 last:border-0 pb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-gray-800">{item.subject.characters}</span>
                                <span className="text-xs uppercase bg-gray-200 px-2 py-0.5 rounded text-gray-600">{item.type}</span>
                            </div>
                            <span className="font-medium text-red-600">{item.correctAnswer}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex justify-center gap-4">
           <Button onClick={initGame}>Play Again</Button>
           {!propItems && <Button variant="outline" onClick={() => navigate('/session/games')}>Back to Menu</Button>}
        </div>
     </div>
  );

  const q = questions[currentQuestion];
  if (!q) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
            <button onClick={() => setShowHelp(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
               <Icons.Help className="w-6 h-6" />
            </button>
        </div>
        <span className="font-bold text-gray-500">{currentQuestion + 1} / {questions.length}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-8 relative overflow-hidden">
        {q.isReviewable && (
             <div className="absolute top-0 right-0 bg-yellow-400 text-white text-xs font-bold px-2 py-1">REVIEW</div>
        )}
        <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
           Select the Correct {q.type}
        </div>
        <div className="text-6xl font-bold text-gray-800 mb-4">
           {q.subject.characters || <img src={q.subject.character_images[0].url} className="w-16 h-16 mx-auto" alt="" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt: string, idx: number) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === q.correctAnswer;
            
            let btnClass = "border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700";
            
            if (selectedAnswer) {
                if (isCorrect) {
                    btnClass = "border-green-500 bg-green-50 text-green-700 font-bold ring-2 ring-green-200";
                } else if (isSelected) {
                    btnClass = "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200";
                } else {
                    btnClass = "border-gray-200 opacity-50";
                }
            }

            return (
                <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selectedAnswer}
                    className={`p-4 rounded-xl border-2 transition-all font-medium text-lg ${btnClass}`}
                >
                    {opt}
                    {selectedAnswer && isCorrect && <Icons.Check className="inline-block ml-2 w-5 h-5" />}
                    {isSelected && !isCorrect && <Icons.X className="inline-block ml-2 w-5 h-5" />}
                </button>
            )
        })}
      </div>

      <HowToPlayModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Quick Quiz"
        steps={[
           { title: "Read the Prompt", description: "Look at the big character displayed on the card.", icon: Icons.FileQuestion },
           { title: "Choose Wisely", description: "Tap the correct Meaning or Reading from the list below.", icon: Icons.Check },
           { title: "Review Items", description: "Getting a 'Review' item correct sends the review to WaniKani!", icon: Icons.Sparkles }
        ]}
      />
    </div>
  );
};
