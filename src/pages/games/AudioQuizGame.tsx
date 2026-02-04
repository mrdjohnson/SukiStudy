import { useState, useEffect, useRef, useMemo, MouseEventHandler } from 'react'
import { QuestionDisplay } from '../../components/QuestionDisplay'
import { GameComponent, GameItem, MultiChoiceGameItem, SubjectType } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { useGameLogic } from '../../hooks/useGameLogic'
import _ from 'lodash'
import { GameContainer } from '../../components/GameContainer'
import { toItemWithAnswer } from '../../utils/multiChoiceGame'
import { MultiChoiceSelectionItem } from '../../components/MultiChoiceSelectionItem'
import { ActionIcon } from '@mantine/core'
import { colorByType } from '../../utils/subject'

export const AudioQuizGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  // Filter only items with audio
  const items = useMemo(() => {
    let itemOptions = propItems || fetchedItems

    const pairType = _.sample(['reading', 'meaning'] as const)

    return _.chain(itemOptions)
      .filter(i => !!i.subject.pronunciation_audios?.[0])
      .map(item => toItemWithAnswer(item, pairType))
      .compact()
      .value()
  }, [fetchedItems, propItems])

  const gameLogic = useGameLogic<MultiChoiceGameItem>({
    gameId: 'audio',
    totalRounds: propItems?.length || 10,
    onComplete,
    onRoundFinish: () => {
      setSelectedAnswer(null)
    },
  })

  const { startGame, recordAttempt, gameState, setGameItems, skip } = gameLogic
  const { roundNumber, maxRoundNumber, gameItems } = gameState

  const currentItem = gameItems[roundNumber - 1]

  const [selectedAnswer, setSelectedAnswer] = useState<{ value: string; correct: boolean } | null>(
    null,
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { setHelpSteps } = useSettings()

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
  }, [currentItem?.subject.id, items, propItems])

  useEffect(() => {
    setHelpSteps([
      { title: 'Listen', description: 'Tap the speaker to hear the word.', icon: Icons.Volume },
      {
        title: 'Select',
        description: 'Choose the vocabulary word that matches the audio.',
        icon: Icons.Check,
      },
      {
        title: 'Practice',
        description: 'Great for differentiating homophones or similar sounding words.',
        icon: Icons.Music,
      },
    ])

    return () => setHelpSteps(null)
  }, [])

  const playQuestionAudio: MouseEventHandler = e => {
    e?.stopPropagation()

    if (currentItem.subject.pronunciation_audios) {
      const audios = currentItem.subject.pronunciation_audios
      // Pick a random audio sample from the subject
      const audio = _.sample(audios)!

      if (audioRef.current) {
        audioRef.current.src = audio.url
        audioRef.current.play()
      } else {
        const a = new Audio(audio.url)
        audioRef.current = a
        a.play()
      }
    }
  }

  const initGame = () => {
    _.chain(items).sampleSize(maxRoundNumber).tap(setGameItems).value()
  }

  // Auto play audio when question sets
  useEffect(() => {
    if (currentItem) {
      setTimeout(playQuestionAudio, 500)
    }
  }, [currentItem?.subject.id])

  useEffect(() => {
    if (!loading && items.length >= 4) {
      startGame()
      initGame()
    }
  }, [items, loading])

  const handleAnswer = (value: string) => {
    if (selectedAnswer || !currentItem) return

    const correct = value === currentItem.answer

    setSelectedAnswer({ value, correct })
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

  const restartGame = () => {
    startGame()
    initGame()
  }

  return (
    <GameContainer
      gameLogic={gameLogic}
      skip={() => skip(currentItem)}
      onPlayAgain={restartGame}
      isLastGame={isLastGame}
    >
      {currentItem && (
        <>
          <QuestionDisplay
            key={currentItem.subject.id}
            subject={currentItem.subject}
            isReviewable={!!currentItem.isReviewable}
            isInteractionEnabled={!!selectedAnswer}
            customContent={
              <div className="flex flex-col items-center">
                <ActionIcon
                  color={colorByType[currentItem.subject.object || SubjectType.VOCABULARY]}
                  onClick={playQuestionAudio}
                  variant="light"
                  className="size-18! rounded-full! suppress-card-hover hover:scale-120 transition-transform"
                >
                  <Icons.Volume />
                </ActionIcon>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-3 mb-8">
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
      )}
    </GameContainer>
  )
}
