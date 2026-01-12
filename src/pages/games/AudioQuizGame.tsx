import React, { useState, useEffect, useRef, useMemo } from 'react'
import { GameItem, MultiChoiceGameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { useGameLogic } from '../../hooks/useGameLogic'
import _ from 'lodash'
import { GameContainer } from '../../components/GameContainer'
import { toItemWithAnswer } from '../../utils/multiChoiceGame'
import { MultiChoiceSelectionItem } from '../../components/MultiChoiceSelectionItem'

interface AudioQuizGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const AudioQuizGame: React.FC<AudioQuizGameProps> = ({ items: propItems, onComplete }) => {
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
    onRoundFinish: () => {
      setSelectedAnswer(null)
    },
  })

  const { startGame, recordAttempt, gameState, setGameItems, skip } = gameLogic
  const { roundNumber, maxRoundNumber, gameItems, isFinished } = gameState

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

    return _.chain(items)
      .map('answer')
      .without(answer)
      .sampleSize(3)
      .concat(answer)
      .shuffle()
      .value()
  }, [currentItem?.subject.id, items])

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

  const playQuestionAudio = () => {
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

  return (
    <GameContainer gameLogic={gameLogic} skip={() => skip(currentItem)}>
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
    </GameContainer>
  )
}
