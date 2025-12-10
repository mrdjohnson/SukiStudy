
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { Flashcard } from '../../components/Flashcard';

interface VariationsQuizGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: () => void;
}

export const VariationsQuizGame: React.FC<VariationsQuizGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(user, !propItems);
  const items = propItems || fetchedItems;

  const [question, setQuestion] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);
  
  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    setHelpSteps([
        { title: "Select Variations", description: "Select all correct readings (On'yomi & Kun'yomi). Only readings WaniKani accepts count.", icon: Icons.ListCheck },
        { title: "Hidden Meaning", description: "The English meaning is hidden until you submit.", icon: Icons.FileQuestion },
        { title: "Check Details", description: "After submitting, click the Kanji to see full details.", icon: Icons.BookOpen }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const initRound = () => {
    setSelectedOptions([]);
    setSubmitted(false);
    
    const kanjiItems = items.filter(i => i.subject.object === 'kanji');
    if (kanjiItems.length === 0) return;

    kanjiItems.sort((a, b) => a.isReviewable ? -1 : 1);
    const target = kanjiItems[Math.floor(Math.random() * Math.min(5, kanjiItems.length))];

    // Filter to only accepted answers (taught readings)
    const correctReadings = target.subject.readings
        ?.filter(r => r.accepted_answer || r.primary)
        .map(r => r.reading) || [];
    
    // Distractors from other kanji
    const distractors = kanjiItems
      .filter(i => i.subject.id !== target.subject.id)
      .flatMap(i => i.subject.readings?.map(r => r.reading) || [])
      .sort(() => 0.5 - Math.random())
      .slice(0, 5); 

    const options = Array.from(new Set([...correctReadings, ...distractors])).sort(() => 0.5 - Math.random());

    setQuestion({
      target,
      correctReadings,
      options
    });
  };

  useEffect(() => {
    if (!loading && items.length > 0) initRound();
  }, [items, loading]);

  const toggleOption = (opt: string) => {
    if (submitted) return;
    setSelectedOptions(prev => 
       prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctSet = new Set(question.correctReadings);
    const selectedSet = new Set(selectedOptions);
    
    const allCorrectSelected = question.correctReadings.every((r: string) => selectedSet.has(r));
    const noExtras = selectedOptions.every(o => correctSet.has(o));
    
    if (allCorrectSelected && noExtras) {
       playSound('success', soundEnabled);
       setScore(s => s + 1);
       if (question.target.isReviewable && question.target.assignment.id) {
          waniKaniService.createReview(question.target.assignment.id, 0, 0);
       }
    } else {
       playSound('error', soundEnabled);
    }
  };

  const nextRound = () => {
    if (round >= 5) {
      setFinished(true);
      if (onComplete) setTimeout(onComplete, 1000);
    } else {
      setRound(r => r + 1);
      initRound();
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  
  if (finished) return (
     <div className="max-w-2xl mx-auto p-8 text-center">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Game Over!</h2>
        <p className="text-xl text-gray-600 mb-8">Score: {score} / 5</p>
        <div className="flex justify-center gap-4">
            <Button onClick={() => { setRound(1); setScore(0); setFinished(false); initRound(); }}>Play Again</Button>
            {!propItems && <Button variant="outline" onClick={() => navigate('/session/games')}>Back to Menu</Button>}
        </div>
     </div>
  );

  if (!question) return <div className="p-8 text-center">Not enough Kanji items loaded.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
        </div>
        <span className="font-bold text-gray-500">Round {round} / 5</span>
      </div>

      <div className="text-center mb-8">
         <div className="text-xs font-bold uppercase text-indigo-500 tracking-widest mb-2">Select ALL correct readings</div>
         
         <div 
            onClick={() => submitted && setShowFlashcard(true)}
            className={`text-6xl font-bold mb-4 inline-block transition-colors ${submitted ? 'text-indigo-600 cursor-pointer underline decoration-dotted underline-offset-8' : 'text-gray-900'}`}
            title={submitted ? "Click to view flashcard" : ""}
         >
            {question.target.subject.characters}
         </div>

         {/* Meaning revealed after submit */}
         <div className={`text-lg font-medium transition-opacity duration-500 ${submitted ? 'opacity-100 text-gray-700' : 'opacity-0'}`}>
            {question.target.subject.meanings[0].meaning}
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
         {question.options.map((opt: string) => {
            const isSelected = selectedOptions.includes(opt);
            const isCorrect = question.correctReadings.includes(opt);
            
            let className = "p-4 rounded-xl border-2 font-bold text-lg transition-all ";
            
            if (submitted) {
               if (isCorrect) className += "bg-green-100 border-green-500 text-green-800";
               else if (isSelected && !isCorrect) className += "bg-red-100 border-red-500 text-red-800 opacity-50";
               else className += "bg-gray-50 border-gray-200 text-gray-400";
            } else {
               if (isSelected) className += "bg-indigo-100 border-indigo-500 text-indigo-800";
               else className += "bg-white border-gray-200 text-gray-700 hover:border-indigo-300";
            }

            return (
               <button key={opt} onClick={() => toggleOption(opt)} className={className} disabled={submitted}>
                 {opt}
               </button>
            )
         })}
      </div>

      <div className="text-center">
         {!submitted ? (
             <Button size="lg" onClick={handleSubmit} disabled={selectedOptions.length === 0}>Submit Answer</Button>
         ) : (
             <Button size="lg" onClick={nextRound}>Next Question</Button>
         )}
      </div>

      {showFlashcard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowFlashcard(false)}>
            <div className="w-full max-w-2xl h-full flex items-center" onClick={e => e.stopPropagation()}>
                <Flashcard 
                    subject={question.target.subject}
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
