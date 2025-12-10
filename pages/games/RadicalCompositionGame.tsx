
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, GameItem, SubjectType } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { GameResults } from '../../components/GameResults';
import { openFlashcardModal } from '../../components/modals/FlashcardModal';

interface RadicalCompositionGameProps {
  user: User;
  items?: GameItem[];
  onComplete?: (data?: any) => void;
}

export const RadicalCompositionGame: React.FC<RadicalCompositionGameProps> = ({ user, items: propItems, onComplete }) => {
  // Only fetch Kanji
  const { items: fetchedItems, loading } = useLearnedSubjects(user, !propItems);
  const items = useMemo(() => {
    return (propItems || fetchedItems).filter(i => i.subject.object === 'kanji')
  }, [fetchedItems, propItems]);

  const [question, setQuestion] = useState<{
    kanji: Subject,
    assignment?: any,
    correctIds: number[],
    options: Subject[]
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  
  const [history, setHistory] = useState<{subject: Subject, correct: boolean}[]>([]);
  const startTimeRef = useRef(Date.now());
  const [finished, setFinished] = useState(false);

  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();
  const MAX_ROUNDS = 5;

  useEffect(() => {
    setHelpSteps([
      { title: "Deconstruct Kanji", description: "Look at the Kanji displayed.", icon: Icons.Puzzle },
      { title: "Select Radicals", description: "Choose ALL the radical parts that make up the Kanji.", icon: Icons.ListCheck },
      { title: "Learn Composition", description: "Understanding parts helps you learn complex Kanji faster.", icon: Icons.Brain }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const initRound = async () => {
    setLoadingComponents(true);
    setSelectedIds([]);
    setSubmitted(false);

    if (round === 1) {
        setHistory([]);
        setScore(0);
        startTimeRef.current = Date.now();
    }

    if (items.length === 0) {
      setLoadingComponents(false);
      return;
    }

    // Pick random kanji that HAS components
    const candidates = items.filter(i => i.subject.component_subject_ids && i.subject.component_subject_ids.length > 1);
    if (candidates.length === 0) {
      setLoadingComponents(false);
      return;
    }

    const selection = candidates[Math.floor(Math.random() * candidates.length)];
    const target = selection.subject;
    const correctIds = target.component_subject_ids;

    try {
      // Fetch correct components
      const correctCol = await waniKaniService.getSubjects(correctIds);
      const correctSubjects = correctCol.data.map(d => ({ ...d.data, id: d.id }));

      // Fetch distractors (random radicals from other items in user's learned list if possible, or just random radicals)
      const otherComponentIds = candidates
        .filter(c => c.subject.id !== target.id)
        .flatMap(c => c.subject.component_subject_ids)
        .sort(() => 0.5 - Math.random())
        .slice(0, 6); 

      let distractorSubjects: Subject[] = [];
      if (otherComponentIds.length > 0) {
        const disCol = await waniKaniService.getSubjects(otherComponentIds);
        distractorSubjects = disCol.data.map(d => ({ ...d.data, id: d.id }));
      }

      // Combine and shuffle
      const options = [...correctSubjects, ...distractorSubjects].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); // Unique
      options.sort(() => 0.5 - Math.random());

      setQuestion({
        kanji: target,
        assignment: selection.assignment,
        correctIds,
        options
      });
    } catch (e) {
      console.error("Failed to fetch composition", e);
    } finally {
      setLoadingComponents(false);
    }
  };

  useEffect(() => {
    if (!loading && items.length > 0) initRound();
  }, [items, loading]);

  const toggleSelection = (id: number) => {
    if (submitted) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    if (!question) return;
    setSubmitted(true);

    const correctSet = new Set(question.correctIds);
    const selectedSet = new Set(selectedIds);

    // Check exact match of sets
    const isCorrect = question.correctIds.every(id => selectedSet.has(id)) && selectedIds.length === question.correctIds.length;
    
    setHistory(prev => [...prev, { subject: question.kanji, correct: isCorrect }]);

    if (isCorrect) {
      playSound('success', soundEnabled);
      setScore(s => s + 1);
    } else {
      playSound('error', soundEnabled);
    }
  };

  const handleNext = () => {
    if (round >= MAX_ROUNDS) {
      setFinished(true);
    } else {
      setRound(r => r + 1);
      initRound();
    }
  };

  const handleFinish = () => {
      if (onComplete) {
          onComplete({
              gameId: 'radical-composition',
              score: score,
              maxScore: MAX_ROUNDS,
              timeTaken: (Date.now() - startTimeRef.current) / 1000,
              history: history
          });
      }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  if (finished) return (
      <GameResults
         gameId="radical-composition"
         score={score}
         maxScore={MAX_ROUNDS}
         timeTaken={(Date.now() - startTimeRef.current) / 1000}
         history={history}
         onNext={handleFinish}
         isLastGame={!propItems}
      />
  );

  if (loadingComponents || !question) return <div className="flex h-[50vh] items-center justify-center"><div className="animate-spin text-indigo-400"><Icons.Puzzle /></div></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
        </div>
        <div className="font-bold text-gray-500">Round {round} / {MAX_ROUNDS}</div>
      </div>

      <div className="text-center mb-8">
        <div className="text-xs font-bold uppercase text-indigo-500 tracking-widest mb-2">Select the radicals</div>
        <div
          onClick={() => submitted && openFlashcardModal(question.kanji, question.assignment)}
          className={`text-8xl font-bold mb-4 inline-block transition-colors ${submitted ? 'text-indigo-600 cursor-pointer hover:scale-105' : 'text-gray-900'}`}
        >
          {question.kanji.characters}
        </div>
        <div className="text-lg text-gray-600 font-medium">
          {question.kanji.meanings[0].meaning}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
        {question.options.map(opt => {
          const isSelected = selectedIds.includes(opt.id!);
          const isCorrect = question.correctIds.includes(opt.id!);

          let styles = "bg-white border-gray-200 text-gray-700 hover:border-indigo-300";
          if (submitted) {
            if (isCorrect) styles = "bg-green-100 border-green-500 text-green-800";
            else if (isSelected && !isCorrect) styles = "bg-red-100 border-red-500 text-red-800 opacity-50";
            else styles = "bg-gray-50 border-gray-200 text-gray-400 opacity-50";
          } else if (isSelected) {
            styles = "bg-indigo-100 border-indigo-500 text-indigo-800 ring-2 ring-indigo-200";
          }

          return (
            <button
              key={opt.id}
              onClick={() => toggleSelection(opt.id!)}
              disabled={submitted}
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${styles}`}
            >
              <div className="text-3xl font-bold mb-1">
                {opt.characters || (
                  <div className="w-8 h-8">
                    <img src={opt.character_images.find(i => i.content_type === 'image/svg+xml')?.url} className="w-full h-full" alt="" />
                  </div>
                )}
              </div>
              <div className="text-xs truncate max-w-full px-1">{opt.meanings[0].meaning}</div>
            </button>
          )
        })}
      </div>

      <div className="text-center">
        {!submitted ? (
          <Button size="lg" onClick={handleSubmit} disabled={selectedIds.length === 0}>Submit</Button>
        ) : (
          <Button size="lg" onClick={handleNext}>Next Kanji</Button>
        )}
      </div>
    </div>
  );
};
