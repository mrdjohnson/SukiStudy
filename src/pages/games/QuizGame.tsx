import { useState, useEffect, useMemo } from 'react'
import { QuestionDisplay } from '../../components/QuestionDisplay'
import { GameComponent, GameItem, MultiChoiceGameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { GameContainer } from '../../components/GameContainer'
import { useGameLogic } from '../../hooks/useGameLogic'
import _ from 'lodash'
import { toItemWithAnswer } from '../../utils/multiChoiceGame'
import { MultiChoiceSelectionItem } from '../../components/MultiChoiceSelectionItem'

export const QuizGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)

  const items = useMemo(() => {
    let itemOptions = propItems || fetchedItems

    const pairType = _.sample(['reading', 'meaning'] as const)

    return _.chain(itemOptions)
      .map(item => toItemWithAnswer(item, pairType))
      .compact()
      .value()
  }, [propItems, fetchedItems])

  const [selectedAnswer, setSelectedAnswer] = useState<{ value: string; correct: boolean } | null>(
    null,
  )

  const gameLogic = useGameLogic<MultiChoiceGameItem>({
    gameId: 'quiz',
    totalRounds: propItems?.length || 10,
    canSkip: true,
    onComplete,
    onRoundFinish() {
      setSelectedAnswer(null)
    },
  })

  const { gameState, skip, recordAttempt, startGame, setGameItems } = gameLogic
  const { gameItems, roundNumber, maxRoundNumber } = gameState

  const { setHelpSteps } = useSettings()

  const currentItem = gameItems[roundNumber - 1]

  const options = useMemo(() => {
    if (!currentItem) return []

    const answer = currentItem.answer

    if (!answer) return []

    let itemChain = _.chain(items)

    if (!propItems) {
      // only keep items of the same type

      itemChain = itemChain.filter(
        (item: GameItem) => item.subject.object === currentItem.subject.object,
      )
    }

    return itemChain.map('answer').without(answer).sampleSize(3).concat(answer).shuffle().value()
  }, [currentItem?.subject.id, items])

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

    _.chain(items).sampleSize(maxRoundNumber).shuffle().tap(setGameItems).value()
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
    if (selectedAnswer || !currentItem) return

    const correct = value === currentItem.answer

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
      skip={() => skip(currentItem!)}
      onPlayAgain={initGame}
      isLastGame={isLastGame}
      children={
        currentItem && (
          <>
            <QuestionDisplay
              key={currentItem.subject.id}
              subject={currentItem.subject}
              question={currentItem.question}
              isReviewable={!!currentItem.isReviewable}
              isInteractionEnabled={!!selectedAnswer}
            />

            <div className="grid grid-cols-1 gap-3">
              {options.map(opt => (
                <MultiChoiceSelectionItem
                  key={opt}
                  option={opt}
                  answer={currentItem.answer}
                  selectedAnswer={selectedAnswer}
                  handleAnswer={handleAnswer}
                />
              ))}
            </div>
          </>
        )
      }
    />
  )
}
