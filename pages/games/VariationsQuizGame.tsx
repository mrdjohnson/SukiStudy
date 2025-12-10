
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useSet } from '@mantine/hooks'
import _ from 'lodash'

import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { GameResults } from '../../components/GameResults';
import { openFlashcardModal } from '../../components/modals/FlashcardModal';
import { useAllSubjects } from '../../hooks/useAllSubjects'

interface VariationsQuizGameProps {
    user: User;
    items?: GameItem[];
    onComplete?: (data?: any) => void;
}

type Question = {
   target: GameItem;
   correctReadings: string[];
   options: string[];
}

export const VariationsQuizGame: React.FC<VariationsQuizGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useAllSubjects(user, !propItems);
  const items = propItems || fetchedItems;

  const [question, setQuestion] = useState<Question | null>(null);
  const selectedOptions = useSet<string>();
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  
  const [history, setHistory] = useState<{subject: Subject, correct: boolean}[]>([]);
  const startTimeRef = useRef(Date.now());

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

   const kanjiItems = useMemo(()=>{
     return items.filter(i => i.assignment.subject_type === 'kanji' && !_.isEmpty(i.subject.readings))
   }, [items, history])

  const initRound = () => {
    selectedOptions.clear()
    setSubmitted(false);
    
    if (round === 1) {
        setHistory([]);
        setScore(0);
        startTimeRef.current = Date.now();
    }

    if (kanjiItems.length < 5) {
      setFinished(true)

      return
    }

    const previousAnswers = new Set(history.map(item => item.subject. id))
    const target = _.chain(kanjiItems).filter(item => !previousAnswers.has(item.subject.id)).sample().value()
    const correctReadings = target.subject.readings.map(r => r.reading)
    
    // Distractors from other kanji
    const distractors = _.chain(kanjiItems)
      .sampleSize(8)
      .flatMap(i => i.subject.readings.map(r => r.reading))
      .without(...correctReadings)
      .sampleSize(6 - target.subject.readings.length)
      .value()

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
    if(selectedOptions.has(opt)) {
       selectedOptions.delete(opt);
    } else {
       selectedOptions.add(opt);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctSet = new Set(question.correctReadings);
    
    const allCorrectSelected = question.correctReadings.every((r: string) => selectedOptions.has(r));
    const noExtras = correctSet.size === selectedOptions.size;
    const isCorrect = allCorrectSelected && noExtras;
    
    setHistory(prev => [...prev, { subject: question.target.subject, correct: isCorrect }]);

    if (isCorrect) {
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
    } else {
      setRound(r => r + 1);
      initRound();
    }
  };

  const handleFinish = () => {
      if (onComplete) {
          onComplete({
              gameId: 'variations',
              score: score,
              maxScore: 5,
              timeTaken: (Date.now() - startTimeRef.current) / 1000,
              history: history
          });
      }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  
  if (finished) return (
     <GameResults
         gameId="variations"
         score={score}
         maxScore={5}
         timeTaken={(Date.now() - startTimeRef.current) / 1000}
         history={history}
         onNext={handleFinish}
         isLastGame={!propItems}
      />
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
            onClick={() => submitted && openFlashcardModal(question.target.subject, question.target.assignment)}
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
            const isSelected = selectedOptions.has(opt);
            const isCorrect = question.correctReadings.includes(opt);
            
            let className = "p-4 rounded-xl border-2 font-bold text-lg transition-all ";
            
            if (submitted) {
               if(isSelected) className += " opacity-30 "
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
    </div>
  );
};
