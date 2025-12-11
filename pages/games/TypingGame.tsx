import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Subject, GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { playSound } from '../../utils/sound'
import { useSettings } from '../../contexts/SettingsContext'
import { waniKaniService } from '../../services/wanikaniService'
import { toHiragana } from '../../utils/kana'
import { levenshteinDistance } from '../../utils/string'
import { GameResults } from '../../components/GameResults'
import { openFlashcardModal } from '../../components/modals/FlashcardModal'

interface TypingGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const TypingGame: React.FC<TypingGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const [currentItem, setCurrentItem] = useState<GameItem | null>(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [round, setRound] = useState(1)
  const MAX_ROUNDS = 10

  const [history, setHistory] = useState<{ subject: Subject; correct: boolean }[]>([])
  const startTimeRef = useRef(Date.now())
  const [finished, setFinished] = useState(false)

  const { soundEnabled, setHelpSteps } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Type Answer',
        description: 'Type the Reading (Hiragana) OR Meaning (English).',
        icon: Icons.Keyboard,
      },
      {
        title: 'Fuzzy Match',
        description: "If you're close, we'll accept it but warn you about spelling.",
        icon: Icons.Check,
      },
      {
        title: 'Flashcard',
        description: 'Upon success, the Kanji becomes clickable to view details.',
        icon: Icons.BookOpen,
      },
    ])
    return () => setHelpSteps(null)
  }, [])

  const nextRound = () => {
    if (round > MAX_ROUNDS) {
      setFinished(true)
      return
    }

    setAnswered(false)
    setInput('')
    setFeedback('')

    // Weighted random selection
    const pool = items.sort(() => 0.5 - Math.random())
    const selection = pool.find(i => i.isReviewable) || pool[0]
    setCurrentItem(selection)
  }

  useEffect(() => {
    if (!loading && items.length > 0) {
      startTimeRef.current = Date.now()
      nextRound()
    }
  }, [loading, items])

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault()
    if (answered || !currentItem) return

    const attempt = input.trim()
    if (!attempt) return

    const meanings = currentItem.subject.meanings.map(m => m.meaning.toLowerCase())
    const readings = currentItem.subject.readings?.map(r => r.reading) || []

    const hiraganaAttempt = toHiragana(attempt)

    // Check Meaning (Exact & Fuzzy)
    const meaningExact = meanings.includes(attempt.toLowerCase())
    const meaningFuzzy = meanings.some(m => levenshteinDistance(m, attempt.toLowerCase()) <= 2)

    // Check Reading (Exact & Fuzzy on Kana)
    const readingExact = readings.includes(hiraganaAttempt)
    const readingFuzzy = readings.some(r => levenshteinDistance(r, hiraganaAttempt) <= 1)

    const isCorrect = meaningExact || readingExact || meaningFuzzy || readingFuzzy

    if (isCorrect) {
      if (meaningExact || readingExact) handleSuccess('Correct!', true)
      else if (meaningFuzzy) handleSuccess('Close enough! Watch spelling.', true)
      else if (readingFuzzy) handleSuccess(`Close! (${hiraganaAttempt})`, true)
    } else {
      playSound('error', soundEnabled)
      setFeedback('Incorrect. Try again.')
    }
  }

  const handleSuccess = (msg: string, isCorrect: boolean) => {
    setAnswered(true)
    setFeedback(msg)
    playSound('success', soundEnabled)
    setScore(s => s + 1)

    if (currentItem) setHistory(prev => [...prev, { subject: currentItem.subject, correct: true }])

    if (currentItem?.isReviewable && currentItem.assignment?.id) {
      waniKaniService.createReview(currentItem.assignment.id, 0, 0)
    }
  }

  const handleNext = () => {
    setRound(r => r + 1)
    nextRound()
  }

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        gameId: 'typing',
        score: score,
        maxScore: MAX_ROUNDS,
        timeTaken: (Date.now() - startTimeRef.current) / 1000,
        history: history,
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

  if (finished)
    return (
      <GameResults
        gameId="typing"
        score={score}
        maxScore={MAX_ROUNDS}
        timeTaken={(Date.now() - startTimeRef.current) / 1000}
        history={history}
        onNext={handleFinish}
        isLastGame={!propItems}
      />
    )

  if (!currentItem) return null

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          {!propItems && (
            <Button variant="ghost" onClick={() => navigate('/session/games')}>
              <Icons.ChevronLeft />
            </Button>
          )}
        </div>
        <div className="font-bold text-gray-500">
          Round {round} / {MAX_ROUNDS}
        </div>
      </div>

      <div className="text-center mb-8">
        <div
          onClick={() =>
            answered && openFlashcardModal(currentItem.subject, currentItem.assignment)
          }
          className={`text-7xl font-bold mb-6 inline-block transition-all ${answered ? 'text-indigo-600 cursor-pointer scale-110' : 'text-gray-900'}`}
        >
          {currentItem.subject.characters || '?'}
        </div>

        <div
          className={`h-8 text-lg font-medium transition-opacity ${answered ? 'opacity-100 text-gray-600' : 'opacity-0'}`}
        >
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
                    ${
                      answered
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                    }
                 `}
            autoFocus
          />
          <div
            className={`mt-3 text-center font-bold h-6 ${feedback.includes('Incorrect') ? 'text-red-500' : 'text-green-600'}`}
          >
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
    </div>
  )
}
