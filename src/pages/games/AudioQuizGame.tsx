import React, { useState, useEffect, useRef, useMemo } from 'react'
import { GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { useGameLogic } from '../../hooks/useGameLogic'
import _ from 'lodash'
import { GameContainer } from '../../components/GameContainer'

interface AudioQuizGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const AudioQuizGame: React.FC<AudioQuizGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  // Filter only items with audio
  const items = useMemo(() => {
    return (propItems || fetchedItems).filter(i => i.subject.pronunciation_audios?.[0])
  }, [fetchedItems, propItems])

  const gameLogic = useGameLogic({
    gameId: 'audio-quiz',
    totalRounds: propItems?.length || 10,
  })

  const { startGame, recordAttempt, gameState, setGameItems, skip } = gameLogic
  const { roundNumber, maxRoundNumber, gameItems, isFinished } = gameState

  const target = gameItems[roundNumber - 1]
  const [submitted, setSubmitted] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { setHelpSteps } = useSettings()

  const options = useMemo(() => {
    if (!target || items.length < 4) return []

    const targetCharacters = target.subject.characters

    return _.chain(items)
      .filter(item => item.subject.characters !== targetCharacters)
      .uniqBy(item => item.subject.characters)
      .sampleSize(3)
      .concat(target)
      .value()
  }, [target?.subject, items])

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
    if (target.subject.pronunciation_audios) {
      const audios = target.subject.pronunciation_audios
      // Pick a random audio sample from the subject
      const audio = audios[Math.floor(Math.random() * audios.length)]

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

  const initRound = () => {
    setSelectedOption(null)
    setSubmitted(false)
  }

  // Auto play audio when question sets
  useEffect(() => {
    if (target) {
      setTimeout(playQuestionAudio, 500)
    }
  }, [target])

  useEffect(() => {
    if (!loading && items.length >= 4) {
      startGame()
      initGame()
    }
  }, [items, loading])

  useEffect(() => {
    initRound()
  }, [target?.subject])

  const handleOptionClick = (id: number) => {
    if (submitted) return
    setSelectedOption(id)
    setSubmitted(true)

    const isCorrect = id === target.subject.id

    recordAttempt(target, isCorrect)
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
    <GameContainer gameLogic={gameLogic} skip={() => skip(target)}>
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
        {target &&
          options.map(opt => {
            const isSelected = selectedOption === opt.subject.id
            const isCorrect = opt.subject.id === target.subject.id

            let styles = 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
            if (submitted) {
              if (isCorrect) styles = 'bg-green-100 border-green-500 text-green-800 font-bold'
              else if (isSelected && !isCorrect)
                styles = 'bg-red-100 border-red-500 text-red-800 opacity-60'
              else styles = 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
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
    </GameContainer>
  )
}
