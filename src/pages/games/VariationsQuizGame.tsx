import React, { useState, useEffect, useMemo } from 'react'
import { QuestionDisplay } from '../../components/QuestionDisplay'
import { useSet } from '@mantine/hooks'
import _ from 'lodash'

import { GameItem, SubjectType } from '../../types'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { useSettings } from '../../contexts/SettingsContext'
import { useAllSubjects } from '../../hooks/useAllSubjects'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import { MultiChoiceSelectionItem } from '../../components/MultiChoiceSelectionItem'

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
    return _.chain(items)
      .filter(i => i.subject.object === SubjectType.KANJI && !_.isEmpty(i.subject.readings))
      .map(item => ({ ...item, answers: _.map(item.subject.readings, answer => answer.reading) }))
      .value()
  }, [items])

  const initGame = () => {
    _.chain(kanjiItems).sampleSize(maxRoundNumber).tap(setGameItems).value()
  }

  const initRound = () => {
    selectedOptions.clear()
    setSubmitted(false)

    const correctReadings = target.subject.readings!.map(r => r.reading)

    const options = _.chain(kanjiItems)
      .flatMap('answers') // grab the answers
      .uniq() // remove duplicates
      .without(...correctReadings) // remove the correct readings
      .sampleSize(6 - correctReadings.length) // grab X amount that totals to 6
      .concat(correctReadings) // re-add the correct readings
      .take(6) // make sure there are only 6 total answers (just incase there are multiple correct ones)
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
    const correctSet = new Set(question!.correctReadings)

    const allCorrectSelected = question!.correctReadings.every((r: string) =>
      selectedOptions.has(r),
    )
    const noExtras = correctSet.size === selectedOptions.size
    const isCorrect = allCorrectSelected && noExtras

    recordAttempt(question!.target, isCorrect)
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
      skip={() => skip(question!.target)}
      onClear={() => selectedOptions.clear()}
      clearDisabled={selectedOptions.size === 0}
      onPlayAgain={restartGame}
      children={
        question && (
          <>
            <QuestionDisplay
              subject={question.target.subject}
              isReviewable={!!question.target.isReviewable}
              isInteractionEnabled={submitted}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {question.options.map((opt: string) => {
                const isSelected = selectedOptions.has(opt)
                const isCorrect = question.correctReadings.includes(opt)

                let feedbackStatus: 'correct' | 'incorrect' | undefined
                if (submitted) {
                  if (isCorrect) feedbackStatus = 'correct'
                  else if (isSelected) feedbackStatus = 'incorrect'
                }

                return (
                  <MultiChoiceSelectionItem
                    key={opt}
                    option={opt}
                    handleAnswer={() => toggleOption(opt)}
                    isSelectedOption={isSelected}
                    feedbackStatus={feedbackStatus}
                    disabled={submitted}
                  />
                )
              })}
            </div>

            <div className="text-center">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={selectedOptions.size === 0 || submitted}
              >
                Submit Answer
              </Button>
            </div>
          </>
        )
      }
    />
  )
}
