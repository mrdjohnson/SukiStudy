import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Subject, GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { playSound } from '../../utils/sound'
import { useSettings } from '../../contexts/SettingsContext'
import { waniKaniService } from '../../services/wanikaniService'
import { HowToPlayModal } from '../../components/HowToPlayModal'
import { GameResults } from '../../components/GameResults'

interface QuizGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const QuizGame: React.FC<QuizGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [questions, setQuestions] = useState<any[]>([])
  const [finished, setFinished] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  // History Tracking
  const [history, setHistory] = useState<{ subject: Subject; correct: boolean }[]>([])
  const startTimeRef = useRef(Date.now())
  const [showHelp, setShowHelp] = useState(false)

  const { soundEnabled } = useSettings()
  const navigate = useNavigate()

  const initGame = () => {
    setFinished(false)
    setCurrentQuestion(0)
    setScore(0)
    setHistory([])
    setSelectedAnswer(null)
    setFeedback(null)
    startTimeRef.current = Date.now()

    if (items.length < 4) return

    const shuffledItems = [...items].sort(() => 0.5 - Math.random())
    const selection = shuffledItems.slice(0, 10)

    const q = selection.map(item => {
      const type = Math.random() > 0.5 ? 'meaning' : 'reading'
      const distractors = items
        .filter(i => i.subject.id !== item.subject.id && i.subject.object === item.subject.object)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)

      const correctAns =
        type === 'meaning'
          ? item.subject.meanings[0].meaning
          : item.subject.readings?.[0]?.reading || item.subject.meanings[0].meaning

      const options = [item, ...distractors]
        .map(i => {
          return type === 'meaning'
            ? i.subject.meanings[0].meaning
            : i.subject.readings?.[0]?.reading || i.subject.meanings[0].meaning
        })
        .sort(() => 0.5 - Math.random())

      return {
        subject: item.subject,
        assignment: item.assignment,
        isReviewable: item.isReviewable,
        type,
        correctAnswer: correctAns,
        options,
      }
    })
    setQuestions(q)
  }

  useEffect(() => {
    if (!loading && items.length >= 4) {
      initGame()
    }
  }, [items, loading])

  const handleAnswer = (ans: string) => {
    if (selectedAnswer) return

    setSelectedAnswer(ans)
    const q = questions[currentQuestion]
    const isCorrect = ans === q.correctAnswer

    // Track history
    setHistory(prev => [...prev, { subject: q.subject, correct: isCorrect }])

    if (isCorrect) {
      setScore(s => s + 1)
      setFeedback('correct')
      playSound('success', soundEnabled)
      if (q.isReviewable && q.assignment && q.assignment.id) {
        waniKaniService.createReview(q.assignment.id, 0, 0)
      }
    } else {
      setFeedback('wrong')
      playSound('error', soundEnabled)
    }

    setTimeout(() => {
      setSelectedAnswer(null)
      setFeedback(null)
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(c => c + 1)
      } else {
        setFinished(true)
      }
    }, 1500)
  }

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        gameId: 'quiz',
        score,
        maxScore: questions.length,
        timeTaken: (Date.now() - startTimeRef.current) / 1000,
        history,
      })
    }
  }

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  if (items.length < 4)
    return <div className="p-8 text-center text-gray-500">Not enough items.</div>

  if (finished)
    return (
      <GameResults
        gameId="quiz"
        score={score}
        maxScore={questions.length}
        timeTaken={(Date.now() - startTimeRef.current) / 1000}
        history={history}
        onNext={handleFinish}
        isLastGame={!propItems} // Standard mode implies last game, propItems usually implies custom/lesson queue
      />
    )

  const q = questions[currentQuestion]
  if (!q) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          {!propItems && (
            <Button variant="ghost" onClick={() => navigate('/session/games')}>
              <Icons.ChevronLeft />
            </Button>
          )}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
          >
            <Icons.Help className="w-6 h-6" />
          </button>
        </div>
        <span className="font-bold text-gray-500">
          {currentQuestion + 1} / {questions.length}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-8 relative overflow-hidden">
        {q.isReviewable && (
          <div className="absolute top-0 right-0 bg-yellow-400 text-white text-xs font-bold px-2 py-1">
            REVIEW
          </div>
        )}
        <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
          Select the Correct {q.type}
        </div>
        <div className="text-6xl font-bold text-gray-800 mb-4">
          {q.subject.characters || (
            <img src={q.subject.character_images[0].url} className="w-16 h-16 mx-auto" alt="" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt: string, idx: number) => {
          const isSelected = selectedAnswer === opt
          const isCorrect = opt === q.correctAnswer

          let btnClass = 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700'

          if (selectedAnswer) {
            if (isCorrect) {
              btnClass =
                'border-green-500 bg-green-50 text-green-700 font-bold ring-2 ring-green-200'
            } else if (isSelected) {
              btnClass = 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
            } else {
              btnClass = 'border-gray-200 opacity-50'
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
          {
            title: 'Read the Prompt',
            description: 'Look at the big character displayed on the card.',
            icon: Icons.FileQuestion,
          },
          {
            title: 'Choose Wisely',
            description: 'Tap the correct Meaning or Reading from the list below.',
            icon: Icons.Check,
          },
          {
            title: 'Review Items',
            description: "Getting a 'Review' item correct sends the review to WaniKani!",
            icon: Icons.Sparkles,
          },
        ]}
      />
    </div>
  )
}
