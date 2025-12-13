import React, { useState, useEffect, useMemo } from 'react'
import { useSet } from '@mantine/hooks'
import _ from 'lodash'

import { GameItem } from '../../types'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { useSettings } from '../../contexts/SettingsContext'
import { openFlashcardModal } from '../../components/modals/FlashcardModal'
import { useAllSubjects } from '../../hooks/useAllSubjects'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'

interface VariationsQuizGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

type Question = {
  target: GameItem
  correctReadings: string[]
  options: string[]
}

export const VariationsQuizGame: React.FC<VariationsQuizGameProps> = ({
  items: propItems,
  onComplete,
}) => {
  const { items: fetchedItems, loading } = useAllSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'variations',
    totalRounds: propItems?.length || 5,
    canSkip: true,
  })

  const { startGame, setGameItems, recordAttempt, gameState, skip } = gameLogic
  const { roundNumber, maxRoundNumber, gameItems, isFinished } = gameState

  const target = gameItems[roundNumber - 1]
  const [question, setQuestion] = useState<Question | null>(null)
  const selectedOptions = useSet<string>()
  const [submitted, setSubmitted] = useState(false)

  const { setHelpSteps } = useSettings()

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Select Variations',
        description:
          "Select all correct readings (On'yomi & Kun'yomi). Only readings WaniKani accepts count.",
        icon: Icons.ListCheck,
      },
      {
        title: 'Hidden Meaning',
        description: 'The English meaning is hidden until you submit.',
        icon: Icons.FileQuestion,
      },
      {
        title: 'Check Details',
        description: 'After submitting, click the Kanji to see full details.',
        icon: Icons.BookOpen,
      },
    ])
    return () => setHelpSteps(null)
  }, [])

  const kanjiItems = useMemo(() => {
    return items.filter(
      i => i.assignment.subject_type === 'kanji' && !_.isEmpty(i.subject.readings),
    )
  }, [items])

  const initGame = () => {
    _.chain(kanjiItems).sampleSize(maxRoundNumber).tap(setGameItems).value()
  }

  const initRound = () => {
    selectedOptions.clear()
    setSubmitted(false)

    const correctReadings = target.subject.readings.map(r => r.reading)

    const options = _.chain(kanjiItems)
      .sampleSize(8) // grab 8 random items
      .flatMap(i => i.subject.readings.map(r => r.reading)) // grab the readings of those items
      .without(...correctReadings) // remove the correct readings
      .uniq() // remove duplicates
      .sampleSize(6 - target.subject.readings.length) // grab X amount that totals to 6
      .concat(correctReadings) // re-add the correct readings
      .shuffle() // dance
      .value()

    setQuestion({
      target,
      correctReadings,
      options,
    })
  }

  useEffect(() => {
    if (!loading && items.length > 0) {
      startGame()
      initGame()
    }
  }, [items, loading])

  useEffect(() => {
    if (isFinished || !target) return

    initRound()
  }, [roundNumber, isFinished, target?.subject])

  const toggleOption = (opt: string) => {
    if (submitted) return
    if (selectedOptions.has(opt)) {
      selectedOptions.delete(opt)
    } else {
      selectedOptions.add(opt)
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const correctSet = new Set(question.correctReadings)

    const allCorrectSelected = question.correctReadings.every((r: string) => selectedOptions.has(r))
    const noExtras = correctSet.size === selectedOptions.size
    const isCorrect = allCorrectSelected && noExtras

    recordAttempt(question.target, isCorrect)
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

  if (!question) return <div className="p-8 text-center">Not enough Kanji items loaded.</div>

  return (
    <GameContainer
      gameLogic={gameLogic}
      skip={() => skip(question.target)}
      onClear={() => selectedOptions.clear()}
      clearDisabled={selectedOptions.size === 0}
    >
      <div className="text-center mb-8">
        <div className="text-xs font-bold uppercase text-indigo-500 tracking-widest mb-2">
          Select ALL correct readings
        </div>

        <div
          onClick={() =>
            submitted && openFlashcardModal(question.target.subject, question.target.assignment)
          }
          className={`text-6xl font-bold mb-4 inline-block transition-colors ${submitted ? 'text-indigo-600 cursor-pointer underline decoration-dotted underline-offset-8' : 'text-gray-900'}`}
          title={submitted ? 'Click to view flashcard' : ''}
        >
          {question.target.subject.characters}
        </div>

        {/* Meaning revealed after submit */}
        <div
          className={`text-lg font-medium transition-opacity duration-500 ${submitted ? 'opacity-100 text-gray-700' : 'opacity-0'}`}
        >
          {question.target.subject.meanings[0].meaning}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {question.options.map((opt: string) => {
          const isSelected = selectedOptions.has(opt)
          const isCorrect = question.correctReadings.includes(opt)

          let className = 'p-4 rounded-xl border-2 font-bold text-lg transition-all '

          if (submitted) {
            if (isSelected) className += ' opacity-30 '
            if (isCorrect) className += 'bg-green-100 border-green-500 text-green-800'
            else if (isSelected && !isCorrect)
              className += 'bg-red-100 border-red-500 text-red-800 opacity-50'
            else className += 'bg-gray-50 border-gray-200 text-gray-400'
          } else {
            if (isSelected) className += 'bg-indigo-100 border-indigo-500 text-indigo-800'
            else className += 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
          }

          return (
            <button
              key={opt}
              onClick={() => toggleOption(opt)}
              className={className}
              disabled={submitted}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <div className="text-center">
        <Button size="lg" onClick={handleSubmit} disabled={selectedOptions.size === 0 || submitted}>
          Submit Answer
        </Button>
      </div>
    </GameContainer>
  )
}
