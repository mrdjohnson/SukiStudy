import React, { useState, useEffect } from 'react'
import { GameItem, MultiChoiceGameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { playSound } from '../../utils/sound'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import _ from 'lodash'
import { selectUniqueItems } from '../../utils/multiChoiceGame'
import { useSet } from '@mantine/hooks'
import { MultiChoiceSelectionItem } from '../../components/MultiChoiceSelectionItem'

interface MatchingGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

type GameCard = MultiChoiceGameItem & {
  id: string
  isQuestion?: boolean
}

export const MatchingGame: React.FC<MatchingGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'matching',
    totalRounds: propItems?.length || 5,
    initialRoundNumber: 0,
    canSkip: false,
    scoreDelay: 0,
  })

  const { startGame, setGameItems, recordAttempt } = gameLogic

  const [leftItems, setLeftItems] = useState<GameCard[]>([])
  const [rightItems, setRightItems] = useState<GameCard[]>([])
  const [selectedItem, setSelectedItem] = useState<GameCard | null>(null)
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null)
  const [feedbackState, setFeedbackState] = useState<{
    ids: string[]
    status: 'correct' | 'incorrect'
  } | null>(null)
  const matchedIds = useSet<string>()

  const { soundEnabled, setHelpSteps } = useSettings()

  const initGame = () => {
    startGame()
    setSelectedItem(null)
    setSelectedSide(null)

    const selectedItems = selectUniqueItems(items, 6)

    _.chain(selectedItems)
      .tap(setGameItems)
      .tap(items =>
        setLeftItems(
          items.map(item => ({ ...item, id: String(item.subject.id), isQuestion: true })),
        ),
      )
      .shuffle() // randomize answers
      .tap(items => setRightItems(items.map(item => ({ ...item, id: `${item.subject.id}-right` }))))
      .value()
  }

  useEffect(() => {
    if (!loading && items.length >= 5) {
      initGame()
    }
  }, [items, loading])

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Select Item',
        description: 'Tap any item on the left or right.',
        icon: Icons.GripVertical,
      },
      {
        title: 'Find Match',
        description: 'Tap the corresponding matching pair on the other side.',
        icon: Icons.Shuffle,
      },
      {
        title: 'Clear Board',
        description: 'Match all pairs to win! Matched pairs stay visible but fade out.',
        icon: Icons.CheckCircle,
      },
    ])

    return () => setHelpSteps(null)
  }, [])

  const handleSelection = (gameItem: GameCard, side: 'left' | 'right') => {
    // Block interaction during feedback delay
    if (feedbackState) return

    const id = gameItem.id

    if (matchedIds.has(id)) return

    // First selection
    if (selectedItem === null) {
      setSelectedItem(gameItem)
      setSelectedSide(side)
      playSound('pop', soundEnabled)
      return
    }

    // Deselect if same item clicked
    if (selectedItem.id === gameItem.id) {
      setSelectedItem(null)
      setSelectedSide(null)
      return
    }

    // Switch selection if same side clicked
    if (selectedSide === side) {
      setSelectedItem(gameItem)
      playSound('pop', soundEnabled)
      return
    }

    // Check match
    const isMatch = selectedItem.answer === gameItem.answer
    setFeedbackState({
      ids: [selectedItem.id, gameItem.id],
      status: isMatch ? 'correct' : 'incorrect',
    })

    if (isMatch) {
      const questionItem = selectedItem.isQuestion ? selectedItem : gameItem
      recordAttempt(questionItem, true)
    } else {
      playSound('error', soundEnabled)
    }

    // Delay clearing/processing
    setTimeout(() => {
      if (isMatch) {
        matchedIds.add(selectedItem.id)
        matchedIds.add(gameItem.id)
      }

      setSelectedItem(null)
      setSelectedSide(null)
      setFeedbackState(null)
    }, 1200)
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

  // const createItemCard = (side: 'left' | 'right') => (item: GameCard) => {
  //   const isMatched = matchedIds.has(item.id)
  //   const isSelected = selectedItem?.id === item.id

  //   return (
  //     <button
  //       key={item.subject.id}
  //       onClick={() => handleSelection(item, side)}
  //       disabled={isMatched}
  //       className={`
  //                  w-full h-20 flex items-center justify-center bg-white border-2 rounded-xl font-bold text-3xl shadow-sm transition-all
  //                  ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
  //                  ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}
  //                `}
  //     >
  //       {side === 'left' ? item.question : item.answer}
  //     </button>
  //   )
  // }

  const createItemCard = (side: 'left' | 'right') => (item: GameCard) => {
    const isMatched = matchedIds.has(item.id)
    const isSelected = selectedItem?.id === item.id

    let feedbackStatus: 'correct' | 'incorrect' | undefined
    if (feedbackState && feedbackState.ids.includes(item.id)) {
      feedbackStatus = feedbackState.status
    }

    return (
      <MultiChoiceSelectionItem
        key={item.id}
        handleAnswer={() => handleSelection(item, side)}
        disabled={isMatched}
        option={side === 'left' ? item.question : item.answer}
        isSelectedOption={isSelected}
        feedbackStatus={feedbackStatus}
      />
    )
  }

  return (
    <GameContainer gameLogic={gameLogic} onPlayAgain={initGame}>
      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">{leftItems.map(createItemCard('left'))}</div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">{rightItems.map(createItemCard('right'))}</div>
      </div>
    </GameContainer>
  )
}
