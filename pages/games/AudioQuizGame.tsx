
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { User, Subject, GameItem } from '../../types';
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { playSound } from '../../utils/sound';
import { useSettings } from '../../contexts/SettingsContext';
import { waniKaniService } from '../../services/wanikaniService';
import { GameResults } from '../../components/GameResults';
import { openFlashcardModal } from '../../components/modals/FlashcardModal';

interface AudioQuizGameProps {
  user: User;
  items?: GameItem[];
  onComplete?: (data?: any) => void;
}

export const AudioQuizGame: React.FC<AudioQuizGameProps> = ({ user, items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(user, !propItems);
  // Filter only items with audio
  const items = useMemo(() => {
    return (propItems || fetchedItems).filter(i => i.subject.pronunciation_audios?.[0])
  }, [fetchedItems, propItems])

  const [question, setQuestion] = useState<{
    target: GameItem,
    options: GameItem[]
  } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const [history, setHistory] = useState<{subject: Subject, correct: boolean}[]>([]);
  const startTimeRef = useRef(Date.now());
  const [finished, setFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { soundEnabled, setHelpSteps } = useSettings();
  const navigate = useNavigate();
  const MAX_ROUNDS = 10;

  useEffect(() => {
    setHelpSteps([
      { title: "Listen", description: "Tap the speaker to hear the word.", icon: Icons.Volume },
      { title: "Select", description: "Choose the vocabulary word that matches the audio.", icon: Icons.Check },
      { title: "Practice", description: "Great for differentiating homophones or similar sounding words.", icon: Icons.Music }
    ]);
    return () => setHelpSteps(null);
  }, []);

  const playQuestionAudio = () => {
    if (question && question.target.subject.pronunciation_audios) {
      const audios = question.target.subject.pronunciation_audios;
      // Pick a random audio sample from the subject
      const audio = audios[Math.floor(Math.random() * audios.length)];

      if (audioRef.current) {
        audioRef.current.src = audio.url;
        audioRef.current.play();
      } else {
        const a = new Audio(audio.url);
        audioRef.current = a;
        a.play();
      }
    }
  };

  const initRound = () => {
    setSelectedOption(null);
    setSubmitted(false);

    if (round === 1) {
        setHistory([]);
        setScore(0);
        startTimeRef.current = Date.now();
    }

    if (items.length < 4) return;

    const target = items[Math.floor(Math.random() * items.length)];
    const distractors = items
      .filter(i => i.subject.id !== target.subject.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [target, ...distractors].sort(() => 0.5 - Math.random());

    setQuestion({ target, options });
  };

  // Auto play audio when question sets
  useEffect(() => {
    if (question) {
      setTimeout(playQuestionAudio, 500);
    }
  }, [question]);

  useEffect(() => {
    if (!loading && items.length >= 4) initRound();
  }, [items, loading]);

  const handleOptionClick = (id: number) => {
    if (submitted) return;
    setSelectedOption(id);
    setSubmitted(true);

    const isCorrect = id === question?.target.subject.id;
    if(question) setHistory(prev => [...prev, { subject: question.target.subject, correct: isCorrect }]);

    if (isCorrect) {
      playSound('success', soundEnabled);
      setScore(s => s + 1);
      if (question?.target.isReviewable && question.target.assignment?.id) {
        waniKaniService.createReview(question.target.assignment.id, 0, 0);
      }
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
              gameId: 'audio-quiz',
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
         gameId="audio-quiz"
         score={score}
         maxScore={MAX_ROUNDS}
         timeTaken={(Date.now() - startTimeRef.current) / 1000}
         history={history}
         onNext={handleFinish}
         isLastGame={!propItems}
      />
  );

  if (!question) return <div className="p-8 text-center">Not enough vocabulary with audio.</div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          {!propItems && <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>}
        </div>
        <div className="font-bold text-gray-500">Round {round} / {MAX_ROUNDS}</div>
      </div>

      <div className="text-center mb-12">
        <button
          onClick={playQuestionAudio}
          className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 hover:bg-indigo-200 transition-colors shadow-sm animate-pulse-slow"
        >
          <Icons.Volume className="w-16 h-16 text-indigo-600" />
        </button>
        <div className="text-sm text-gray-500 font-medium">Tap to replay audio</div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {question.options.map(opt => {
          const isSelected = selectedOption === opt.subject.id;
          const isCorrect = opt.subject.id === question.target.subject.id;

          let styles = "bg-white border-gray-200 text-gray-700 hover:border-indigo-300";
          if (submitted) {
            if (isCorrect) styles = "bg-green-100 border-green-500 text-green-800 font-bold";
            else if (isSelected && !isCorrect) styles = "bg-red-100 border-red-500 text-red-800 opacity-60";
            else styles = "bg-gray-50 border-gray-100 text-gray-400 opacity-60";
          }

          return (
            <button
              key={opt.subject.id}
              onClick={() => handleOptionClick(opt.subject.id!)}
              disabled={submitted}
              className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${styles}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{opt.subject.characters}</span>
                <span className="text-sm">{opt.subject.meanings[0].meaning}</span>
              </div>
              {submitted && isCorrect && <Icons.Check className="w-5 h-5 text-green-600" />}
            </button>
          )
        })}
      </div>

      {submitted && (
        <div className="text-center animate-fade-in">
          <Button size="lg" onClick={handleNext} className="mb-4">Next Question</Button>
          <div>
            <button onClick={() => openFlashcardModal(question.target.subject, question.target.assignment)} className="text-indigo-600 text-sm font-medium hover:underline">
              View Flashcard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
