

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';

export const VariationsQuizGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [question, setQuestion] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  
  const { soundEnabled } = useSettings();
  const navigate = useNavigate();

  const initRound = () => {
    setSelectedOptions([]);
    setSubmitted(false);
    
    // Pick a Kanji item
    const kanjiItems = items.filter(i => i.subject.object === 'kanji');
    if (kanjiItems.length === 0) return;

    // Favor reviews
    kanjiItems.sort((a, b) => a.isReviewable ? -1 : 1);
    const target = kanjiItems[Math.floor(Math.random() * Math.min(5, kanjiItems.length))];

    // Correct readings
    const correctReadings = target.subject.readings?.map(r => r.reading) || [];
    
    // Distractors (readings from other kanji)
    const distractors = kanjiItems
      .filter(i => i.subject.id !== target.subject.id)
      .flatMap(i => i.subject.readings?.map(r => r.reading) || [])
      .sort(() => 0.5 - Math.random())
      .slice(0, 5); // 5 distractors

    // Combine and shuffle
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
    
    // Check perfect match: All correct selected, no extra selected
    const allCorrectSelected = question.correctReadings.every((r: string) => selectedSet.has(r));
    const noExtras = selectedOptions.every(o => correctSet.has(o));
    
    if (allCorrectSelected && noExtras) {
       playSound('success', soundEnabled);
       setScore(s => s + 1);
       // Submit review
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

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  
  if (finished) return (
     <div className="max-w-2xl mx-auto p-8 text-center">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Game Over!</h2>
        <p className="text-xl text-gray-600 mb-8">Score: {score} / 5</p>
        <Button onClick={() => { setRound(1); setScore(0); setFinished(false); initRound(); }}>Play Again</Button>
     </div>
  );

  if (!question) return <div className="p-8 text-center">Not enough Kanji items loaded.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
        <span className="font-bold text-gray-500">Round {round} / 5</span>
      </div>

      <div className="text-center mb-8">
         <div className="text-xs font-bold uppercase text-indigo-500 tracking-widest mb-2">Select ALL correct readings</div>
         <div className="text-6xl font-bold text-gray-900 mb-2">{question.target.subject.characters}</div>
         <div className="text-gray-500">{question.target.subject.meanings[0].meaning}</div>
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
    </div>
  );
};