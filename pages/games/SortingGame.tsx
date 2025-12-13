import React, { useState, useEffect } from 'react'
import { GameItem, Subject } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { playSound } from '../../utils/sound'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'

interface MatchingGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const MatchingGame: React.FC<MatchingGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'sorting',
    totalRounds: propItems?.length || 5,
    initialRoundNumber: 0,
    canSkip: false,
    scoreDelay: 0
  })

  const { startGame, setGameItems, recordAttempt } = gameLogic

  const [leftItems, setLeftItems] = useState<
    { char: string; id: number; subject: Subject; gameItem: GameItem }[]
  >([])
  const [rightItems, setRightItems] = useState<{ val: string; id: number; gameItem: GameItem }[]>(
    [],
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null)
  const [matchedIds, setMatchedIds] = useState<number[]>([])

  const { soundEnabled, setHelpSteps } = useSettings()

  const initGame = () => {
    startGame()
    setSelectedId(null)
    setSelectedSide(null)
    setMatchedIds([])

    if (items.length < 5) return

    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 5)
    const base = selected.map(s => ({
      id: s.subject.id!,
      char: s.subject.characters || '?',
      val: s.subject.meanings[0].meaning,
      subject: s.subject,
      gameItem: s,
    }))

    setLeftItems(base.map(({ val, ...item }) => item).sort(() => 0.5 - Math.random()))
    setRightItems(base.sort(() => 0.5 - Math.random()))

    setGameItems(base.map(item => item.gameItem))
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

  const handleSelection = (
    { id, gameItem }: { id: number; gameItem: GameItem },
    side: 'left' | 'right',
  ) => {
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

  if (items.length < 5) return <div className="p-8 text-center">Not enough items to match.</div>

  return (
    <GameContainer gameLogic={gameLogic}>
      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">
          {leftItems.map(item => {
            const isMatched = matchedIds.includes(item.id)
            const isSelected = selectedId === item.id && selectedSide === 'left'
            return (
              <button
                key={item.id}
                onClick={() => handleSelection(item, 'left')}
                disabled={isMatched}
                className={`
                   w-full h-20 flex items-center justify-center bg-white border-2 rounded-xl font-bold text-3xl shadow-sm transition-all
                   ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
                   ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}
                 `}
              >
                {item.char}
              </button>
            )
          })}
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">
          {rightItems.map(item => {
            const isMatched = matchedIds.includes(item.id)
            const isSelected = selectedId === item.id && selectedSide === 'right'
            return (
              <button
                key={item.id}
                onClick={() => handleSelection(item, 'right')}
                disabled={isMatched}
                className={`
                   w-full h-20 px-2 flex items-center justify-center rounded-xl font-medium text-sm transition-all border-2
                   ${isMatched ? 'opacity-30 grayscale cursor-default border-gray-100' : 'hover:scale-[1.02]'}
                   ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 bg-gray-50 hover:bg-white'}
                 `}
              >
                {item.val}
              </button>
            )
          })}
        </div>
      </div>
    </GameContainer>
  )
}
export { MatchingGame as SortingGame }
