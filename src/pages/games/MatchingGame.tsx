import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { GameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { playSound } from '../../utils/sound'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import _ from 'lodash'

interface MatchingGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
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

  const [leftItems, setLeftItems] = useState<GameItem[]>([])
  const [rightItems, setRightItems] = useState<GameItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null)
  const [matchedIds, setMatchedIds] = useState<number[]>([])

  const { soundEnabled, setHelpSteps } = useSettings()

  const type = useMemo(() => {
    return propItems || Math.random() > 0.5 ? 'meaning' : 'reading'
  }, [propItems])

  const getItemValue = useCallback(
    (gameItem: GameItem) => {
      if (type === 'meaning') {
        return gameItem.subject.meanings[0]?.meaning
      }

      return gameItem.subject.readings?.[0]?.reading
    },
    [type],
  )

  const initGame = () => {
    startGame()
    setSelectedId(null)
    setSelectedSide(null)
    setMatchedIds([])

    _.chain(items)
      .uniqBy(getItemValue)
      .filter(({ subject }) => !!subject.id && !!subject.characters)
      .filter(item => !!getItemValue(item))
      .sampleSize(5)
      .tap(setGameItems)
      .tap(setLeftItems)
      .shuffle() // randomize answers
      .tap(setRightItems)
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

  const handleSelection = (gameItem: GameItem, side: 'left' | 'right') => {
    const id = gameItem.subject.id

    if (matchedIds.includes(id)) return

    // First selection
    if (selectedId === null) {
      setSelectedId(id)
      setSelectedSide(side)
      playSound('pop', soundEnabled)
      return
    }

    // Deselect if same item clicked
    if (selectedId === id && selectedSide === side) {
      setSelectedId(null)
      setSelectedSide(null)
      return
    }

    // Switch selection if same side clicked
    if (selectedSide === side) {
      setSelectedId(id)
      playSound('pop', soundEnabled)
      return
    }

    // Check match
    if (selectedId === id) {
      // Match found
      recordAttempt(gameItem, true)
      setMatchedIds(prev => [...prev, id])
      setSelectedId(null)
      setSelectedSide(null)
    } else {
      // Wrong match
      playSound('error', soundEnabled)
      setSelectedId(null)
      setSelectedSide(null)
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

  const createItemCard = (side: 'left' | 'right') => (item: GameItem) => {
    const id = item.subject.id
    const isMatched = matchedIds.includes(id)
    const isSelected = selectedId === id && selectedSide === side

    return (
      <button
        key={id}
        onClick={() => handleSelection(item, side)}
        disabled={isMatched}
        className={`
                   w-full h-20 flex items-center justify-center bg-white border-2 rounded-xl font-bold text-3xl shadow-sm transition-all
                   ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
                   ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}
                 `}
      >
        {side === 'left' ? item.subject.characters : getItemValue(item)}
      </button>
    )
  }

  return (
    <GameContainer gameLogic={gameLogic}>
      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">{leftItems.map(createItemCard('left'))}</div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">{rightItems.map(createItemCard('right'))}</div>
      </div>
    </GameContainer>
  )
}

