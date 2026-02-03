import { useState, useEffect } from 'react'
import { GameComponent, GameItem, MultiChoiceGameItem } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { MemoryGameCardContent } from '../../components/MemoryGameCardContent'

import logo from '@/src/assets/apple-touch-icon.png'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import _ from 'lodash'
import { selectUniqueItems } from '../../utils/multiChoiceGame'

type GameCard = MultiChoiceGameItem & {
  id: string
  content: string
  isQuestion?: boolean
  isFlipped?: boolean
  isMatched?: boolean
}

export const MemoryGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'memory',
    totalRounds: propItems?.length || 6,
    initialRoundNumber: 0,
    canSkip: false,
    onComplete,
  })

  const { startGame, setGameItems } = gameLogic

  const [cards, setCards] = useState<GameCard[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])

  const { setHelpSteps } = useSettings()

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Flip Cards',
        description: 'Tap any card to reveal its content. You can flip two cards at a time.',
        icon: Icons.Brain,
      },
      {
        title: 'Find Pairs',
        description: 'Match the Japanese character with its corresponding Meaning or Reading.',
        icon: Icons.CheckCircle,
      },
      {
        title: 'Clear the Board',
        description: 'Find all pairs before the time runs out to win!',
        icon: Icons.Clock,
      },
    ])

    return () => setHelpSteps(null)
  }, [])

  const initGame = () => {
    startGame()
    setFlippedIndices([])

    // Select 6 unique items with non-colliding questions/answers
    const selectedItems = selectUniqueItems(items, 6, propItems)

    const gameCards: GameCard[] = []
    const finalGameItems: GameItem[] = []

    for (const gameItem of selectedItems) {
      const subject = gameItem.subject

      gameCards.push({
        id: `${subject.id}-question`,
        content: gameItem.question,
        isQuestion: true,
        ...gameItem,
      })

      gameCards.push({
        id: `${subject.id}-answer`,
        content: gameItem.answer,
        ...gameItem,
      })

      finalGameItems.push(gameItem)
    }

    if (gameCards.length < 6) return

    setCards(_.shuffle(gameCards))
    setGameItems(finalGameItems)
  }

  useEffect(() => {
    if (!loading && items.length >= 6) {
      initGame()
    }
  }, [items, loading])

  const handleCardClick = (index: number) => {
    if (gameLogic.gameState.isFinished || loading) return
    if (cards[index].isFlipped || cards[index].isMatched) return
    if (flippedIndices.length >= 2) return

    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    const newCards = [...cards]
    newCards[index].isFlipped = true
    setCards(newCards)

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0]
      const idx2 = newFlipped[1]
      const card1 = cards[idx1]
      const card2 = cards[idx2]

      if (card1.answer === card2.answer) {
        const questionCard = card1.isQuestion ? card1 : card2

        gameLogic.recordAttempt(questionCard, true)

        setTimeout(() => {
          const matchedCards = [...cards]
          matchedCards[idx1].isMatched = true
          matchedCards[idx2].isMatched = true
          setCards(matchedCards)
          setFlippedIndices([])
        }, 500)
      } else {
        setTimeout(() => {
          const resetCards = [...cards]
          resetCards[idx1].isFlipped = false
          resetCards[idx2].isFlipped = false
          setCards(resetCards)
          setFlippedIndices([])
        }, 1000)
      }
    }
  }

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  return (
    <GameContainer gameLogic={gameLogic} onPlayAgain={initGame} isLastGame={isLastGame}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(idx)}
            className={`aspect-[3/4] rounded-xl cursor-pointer perspective-1000 transition-all duration-300 ${card.isMatched ? 'opacity-50 grayscale pointer-events-none' : ''}`}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${card.isFlipped ? 'rotate-y-180' : ''}`}
            >
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-red-700 to-amber-900 rounded-xl shadow-md border-2 border-amber-200 flex items-center justify-center">
                <img src={logo} className="size-12 opacity-40" alt={'flipped card ' + idx} />
              </div>

              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border-2 flex flex-col items-center justify-center p-2 text-center`}
              >
                <MemoryGameCardContent content={card.content} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`.rotate-y-180 { transform: rotateY(180deg); } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .perspective-1000 { perspective: 1000px; }`}</style>
    </GameContainer>
  )
}
