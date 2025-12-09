
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

export const QuizGame: React.FC<{ user: User }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || items.length < 4) return;
    
    // Generate 10 questions
    const q = Array.from({length: 10}).map(() => {
       const correctItem = items[Math.floor(Math.random() * items.length)];
       const type = Math.random() > 0.5 ? 'meaning' : 'reading';
       // Filter distractors of same type
       const distractors = items
         .filter(i => i.subject.id !== correctItem.subject.id && i.subject.object === correctItem.subject.object)
         .sort(() => 0.5 - Math.random())
         .slice(0, 3);
       
       const correctAns = type === 'meaning' 
         ? correctItem.subject.meanings[0].meaning 
         : (correctItem.subject.readings?.[0]?.reading || correctItem.subject.meanings[0].meaning); // fallback if radical
       
       const options = [correctItem, ...distractors].map(i => {
          return type === 'meaning' 
            ? i.subject.meanings[0].meaning 
            : (i.subject.readings?.[0]?.reading || i.subject.meanings[0].meaning)
       }).sort(() => 0.5 - Math.random());

       return {
         subject: correctItem.subject,
         type,
         correctAnswer: correctAns,
         options
       };
    });
    setQuestions(q);
  }, [items, loading]);

  const handleAnswer = (ans: string) => {
    if (ans === questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
    if (currentQuestion < 9) {
      setCurrentQuestion(c => c + 1);
    } else {
      setFinished(true);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 4) return <div className="p-8 text-center text-gray-500">Not enough items.</div>;

  if (finished) return (
     <div className="max-w-2xl mx-auto p-8 text-center">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className="text-xl text-gray-600 mb-8">You scored {score} / 10</p>
        <div className="flex justify-center gap-4">
           <Button onClick={() => window.location.reload()}>Play Again</Button>
           <Button variant="outline" onClick={() => navigate('/session/games')}>Back to Menu</Button>
        </div>
     </div>
  );

  const q = questions[currentQuestion];
  if (!q) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
        <span className="font-bold text-gray-500">{currentQuestion + 1} / 10</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
           Select the Correct {q.type}
        </div>
        <div className="text-6xl font-bold text-gray-800 mb-4">
           {q.subject.characters || <img src={q.subject.character_images[0].url} className="w-16 h-16 mx-auto" alt="" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            className="p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-lg text-gray-700"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
