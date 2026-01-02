import React, { useState, useEffect } from 'react'
import { GameItem, Subject } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { MemoryGameCardContent } from '../../components/MemoryGameCardContent'

import logo from '@/src/assets/apple-touch-icon.png'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'

interface GameCard {
  id: string
  subjectId: number
  subject: Subject
  content: string
  type: 'character' | 'meaning' | 'reading'
  isFlipped: boolean
  isMatched: boolean
  subjectType: string
  gameItem: GameItem
}

interface MemoryGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ items: propItems, onComplete }) => {
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

    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 20)
    const gameCards: GameCard[] = []
    const gameItems: GameItem[] = []

    for (const gameItem of selected) {
      if (gameCards.length === 12) break

      const s = gameItem.subject

      const sType = s.object || 'vocabulary'
      let charContent = s.characters
      if (!charContent && s.character_images) {
        const svg = s.character_images.find(i => i.content_type === 'image/svg+xml')
        charContent = svg ? svg.url : '?'
      }

      let pairType: 'meaning' | 'reading' = 'meaning'
      if (sType !== 'radical') {
        pairType = Math.random() > 0.5 ? 'reading' : 'meaning'
      }

      let pairContent = ''
      if (pairType === 'meaning') {
        pairContent = s.meanings.find(m => m.primary)?.meaning || s.meanings[0].meaning
      } else {
        pairContent = s.readings?.find(r => r.primary)?.reading || s.readings?.[0]?.reading || '?'
      }

      if (pairContent === '?') continue

      gameCards.push({
        id: `${s.id}-char`,
        subjectId: s.id!,
        subject: s,
        content: charContent || '?',
        type: 'character',
        isFlipped: false,
        isMatched: false,
        subjectType: sType,
        gameItem,
      })

      gameCards.push({
        id: `${s.id}-pair`,
        subjectId: s.id!,
        subject: s,
        content: pairContent,
        type: pairType,
        isFlipped: false,
        isMatched: false,
        subjectType: sType,
        gameItem,
      })

      gameItems.push(gameItem)
    }

    if (gameCards.length < 6) return

    setCards(gameCards.sort(() => 0.5 - Math.random()))
    setGameItems(gameItems)
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

      if (card1.subjectId === card2.subjectId) {
        gameLogic.recordAttempt(card1.gameItem, true)

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
    <GameContainer gameLogic={gameLogic}>
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
                <img src={logo} className="size-12 opacity-40" alt={card.content} />
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
