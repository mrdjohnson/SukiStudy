import React, { useState, useEffect, useRef } from 'react'
import { QuestionDisplay } from '../../components/QuestionDisplay'
import { GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { playSound } from '../../utils/sound'
import { useSettings } from '../../contexts/SettingsContext'
import { toHiragana } from '../../utils/kana'
import { levenshteinDistance } from '../../utils/string'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import _ from 'lodash'
import clsx from 'clsx'

interface TypingGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const TypingGame: React.FC<TypingGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'typing',
    totalRounds: propItems?.length || 10,
    onComplete,
  })

  const { startGame, recordAttempt, gameState, setGameItems, skip } = gameLogic
  const { roundNumber, maxRoundNumber, gameItems } = gameState

  const currentItem = gameItems[roundNumber - 1]
  const [input, setInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { soundEnabled, setHelpSteps } = useSettings()

  const inputRef = useRef<HTMLInputElement>(null)

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

  const initGame = () => {
    _.chain(items)
      .filter(item => (propItems ? true : !!item.isReviewable))
      .sampleSize(maxRoundNumber)
      .tap(setGameItems)
      .value()
  }

  const nextRound = () => {
    setAnswered(false)
    setInput('')
    setFeedback('')
  }

  useEffect(() => {
    if (!loading && items.length > 0) {
      startGame()
      initGame()
    }
  }, [loading, items])

  useEffect(() => {
    nextRound()
  }, [roundNumber])

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [currentItem])

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault()
    if (answered || !currentItem) return

    setAnswered(true)

    const attempt = input.trim()
    if (!attempt) return

    const meanings = currentItem.subject.meanings.map(m => m.meaning.toLowerCase())
    const readings = currentItem.subject.readings?.map(r => r.reading.toLowerCase()) || []
    const auxMeanings = currentItem.subject.auxiliary_meanings
      .filter(m => m.type === 'whitelist')
      .map(m => m.meaning.toLowerCase())

    const hiraganaAttempt = toHiragana(attempt)

    // Check Meaning (Exact & Fuzzy)
    const meaningExact = meanings.includes(attempt.toLowerCase())
    const meaningFuzzy = meanings.some(
      m => m.length > 3 && levenshteinDistance(m, attempt.toLowerCase()) <= 2,
    )

    // Check Reading (Exact & Fuzzy on Kana)
    const readingExact = readings.includes(hiraganaAttempt)
    const readingFuzzy = readings.some(
      r => r.length > 3 && levenshteinDistance(r, hiraganaAttempt) <= 1,
    )

    // Check Reading (Exact & Fuzzy on Kana)
    const auxMeaningExact = auxMeanings.includes(hiraganaAttempt)
    const auxMeaningFuzzy = auxMeanings.some(
      r => r.length > 3 && levenshteinDistance(r, hiraganaAttempt) <= 1,
    )

    const isCorrect =
      meaningExact ||
      readingExact ||
      meaningFuzzy ||
      readingFuzzy ||
      auxMeaningExact ||
      auxMeaningFuzzy

    recordAttempt(currentItem, isCorrect)

    if (isCorrect) {
      if (meaningExact || readingExact) setFeedback('Correct!')
      else if (meaningFuzzy) setFeedback('Close enough! Watch spelling.')
      else if (readingFuzzy) setFeedback(`Close! (${hiraganaAttempt})`)
    } else {
      playSound('error', soundEnabled)
      setFeedback('Incorrect.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  }

  const restartGame = () => {
    startGame()
    initGame()
  }

  return (
    <GameContainer
      gameLogic={gameLogic}
      skip={() => skip(currentItem)}
      onPlayAgain={restartGame}
      children={
        currentItem && (
          <>
            <QuestionDisplay
              subject={currentItem.subject}
              isReviewable={!!currentItem.isReviewable}
              isInteractionEnabled={answered}
            />

            <div className="max-w-sm mx-auto">
              <form onSubmit={checkAnswer} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={answered}
                  placeholder="Type meaning or reading..."
                  className={clsx(
                    'w-full px-4 py-4 text-center text-xl border-2 rounded-xl outline-none -transition-all shadow-sm',
                    answered
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100',
                  )}
                  ref={inputRef}
                />
                <div
                  className={`mt-3 text-center font-bold h-6 ${feedback.includes('Incorrect') ? 'text-red-500' : 'text-green-600'}`}
                >
                  {feedback}
                </div>
              </form>
            </div>
          </>
        )
      }
    />
  )
}
