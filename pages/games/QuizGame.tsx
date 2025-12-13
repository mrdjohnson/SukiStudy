import React, { useState, useEffect, useMemo } from 'react'
import { GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { GameContainer } from '../../components/GameContainer'
import { useGameLogic } from '../../hooks/useGameLogic'
import _ from 'lodash'

interface QuizGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const QuizGame: React.FC<QuizGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)

  const items = useMemo(() => {
    return (propItems || fetchedItems).filter(
      item => item.subject.meanings[0].meaning && item.subject.readings?.[0]?.reading,
    )
  }, [propItems, fetchedItems])

  const [selectedAnswer, setSelectedAnswer] = useState<{ value: string; correct: boolean } | null>(
    null,
  )

  const gameLogic = useGameLogic({
    gameId: 'quiz',
    totalRounds: propItems?.length || 10,
    canSkip: true,
    onComplete,
  })

  const { gameState, skip, recordAttempt, startGame, setGameItems } = gameLogic
  const { gameItems, roundNumber, maxRoundNumber } = gameState

  const { setHelpSteps } = useSettings()

  const currentItem = gameItems[roundNumber - 1]

  const type = useMemo(() => {
    return Math.random() > 0.5 ? 'meaning' : 'reading'
  }, [currentItem?.subject])

  const options = useMemo(() => {
    if (!currentItem) return []

    const answer =
      type === 'reading'
        ? currentItem.subject.readings[0].reading
        : currentItem.subject.meanings[0].meaning

    return _.chain(items)
      .map(item =>
        type === 'reading' ? item.subject.readings[0].reading : item.subject.meanings[0].meaning,
      )
      .without(answer)
      .sampleSize(3)
      .concat(answer)
      .value()
  }, [currentItem?.subject, items, type])

  useEffect(() => {
    setHelpSteps([
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
    ])

    return () => setHelpSteps(null)
  }, [])

  const initGame = () => {
    startGame()
    setSelectedAnswer(null)

    _.chain(items).sampleSize(maxRoundNumber).tap(setGameItems).value()
  }

  useEffect(() => {
    if (!loading && items.length >= 4) {
      initGame()
    }
  }, [items, loading])

  useEffect(() => {
    setSelectedAnswer(null)
  }, [gameState.roundNumber])

  const handleAnswer = (value: string) => {
    if (selectedAnswer) return

    const correct =
      value === currentItem.subject.readings[0].reading ||
      value === currentItem.subject.meanings[0].meaning

    setSelectedAnswer({ value, correct })

    // Track history
    recordAttempt(currentItem, correct)
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

  return (
    <GameContainer
      gameLogic={gameLogic}
      skip={() => skip(currentItem)}
      children={
        currentItem && (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-8 relative overflow-hidden">
              {currentItem.isReviewable && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-white text-xs font-bold px-2 py-1">
                  REVIEW
                </div>
              )}
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
                Select the Correct {type}
              </div>
              <div className="text-6xl font-bold text-gray-800 mb-4">
                {currentItem.subject.characters || (
                  <img
                    src={currentItem.subject.character_images[0].url}
                    className="w-16 h-16 mx-auto"
                    alt=""
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {options.map((opt: string, idx: number) => {
                const isSelected = selectedAnswer?.value === opt
                const isCorrect = isSelected && selectedAnswer.correct

                let btnClass =
                  'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700'

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
                    key={opt + idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selectedAnswer}
                    className={`p-4 rounded-xl border-2 transition-all font-medium text-lg ${btnClass}`}
                  >
                    {opt}
                    {selectedAnswer && isCorrect && (
                      <Icons.Check className="inline-block ml-2 w-5 h-5" />
                    )}
                    {isSelected && !isCorrect && <Icons.X className="inline-block ml-2 w-5 h-5" />}
                  </button>
                )
              })}
            </div>
          </>
        )
      }
    />
  )
}
