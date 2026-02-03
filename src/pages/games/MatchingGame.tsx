import { useState, useEffect, useRef } from 'react'
import { GameComponent, MultiChoiceGameItem } from '../../types'
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

type GameCard = MultiChoiceGameItem & {
  id: string
  isQuestion?: boolean
}

export const MatchingGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'matching',
    totalRounds: propItems?.length || 5,
    initialRoundNumber: 0,
    canSkip: false,
    scoreDelay: 0,
    onComplete,
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { soundEnabled, setHelpSteps } = useSettings()

  const initGame = () => {
    startGame()
    setSelectedItem(null)
    setSelectedSide(null)
    setFeedbackState(null)
    matchedIds.clear()

    const selectedItems = selectUniqueItems(items, 6, propItems)

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleSelection = (gameItem: GameCard, side: 'left' | 'right') => {
    // Check if we are interrupting an existing feedback verification
    if (feedbackState) {
      if (timerRef.current) clearTimeout(timerRef.current)

      // If it was a match, we need to make sure we persist it
      if (feedbackState.status === 'correct') {
        feedbackState.ids.forEach(id => matchedIds.add(id))

        // If we clicked on one of the matched items, just reset
        if (feedbackState.ids.includes(gameItem.id)) {
          setFeedbackState(null)
          setSelectedItem(null)
          setSelectedSide(null)
          return
        }
      }

      setFeedbackState(null)
      setSelectedItem(gameItem)
      setSelectedSide(side)

      return
    }

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
    timerRef.current = setTimeout(() => {
      timerRef.current = null

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
    <GameContainer gameLogic={gameLogic} onPlayAgain={initGame} isLastGame={isLastGame}>
      <div className="flex gap-8 justify-center">
        {/* Left Column */}
        <div className="flex-1 space-y-4">{leftItems.map(createItemCard('left'))}</div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">{rightItems.map(createItemCard('right'))}</div>
      </div>
    </GameContainer>
  )
}
