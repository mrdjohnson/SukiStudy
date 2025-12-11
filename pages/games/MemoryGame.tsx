import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { GameItem, Subject } from '../../types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { GameResults } from '../../components/GameResults'
import { useSettings } from '../../contexts/SettingsContext'

import logo from '/assets/apple-touch-icon.png'

interface GameCard {
  id: string
  subjectId: number
  subject: Subject
  content: string
  type: 'character' | 'meaning' | 'reading'
  isFlipped: boolean
  isMatched: boolean
  subjectType: string
}

interface MemoryGameProps {
  items?: GameItem[]
  onComplete?: (data?: any) => void
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ items: propItems, onComplete }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const [cards, setCards] = useState<GameCard[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  const startTimeRef = useRef(Date.now())
  const [history, setHistory] = useState<{ subject: Subject; correct: boolean }[]>([])

  const navigate = useNavigate()
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
    setMatches(0)
    setFlippedIndices([])
    setGameOver(false)
    setWon(false)
    setHistory([])
    startTimeRef.current = Date.now()

    if (items.length < 6) {
      return
    }

    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 6)
    const gameCards: GameCard[] = []

    selected.forEach(({ subject: s }) => {
      const sType = s.object || 'vocabulary'
      let charContent = s.characters
      if (!charContent && s.character_images) {
        const svg = s.character_images.find(i => i.content_type === 'image/svg+xml')
        charContent = svg ? svg.url : '?'
      }

      gameCards.push({
        id: `${s.id}-char`,
        subjectId: s.id!,
        subject: s,
        content: charContent || '?',
        type: 'character',
        isFlipped: false,
        isMatched: false,
        subjectType: sType,
      })

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

      gameCards.push({
        id: `${s.id}-pair`,
        subjectId: s.id!,
        subject: s,
        content: pairContent,
        type: pairType,
        isFlipped: false,
        isMatched: false,
        subjectType: sType,
      })
    })

    setCards(gameCards.sort(() => 0.5 - Math.random()))
  }

  useEffect(() => {
    if (!loading && items.length >= 6) {
      initGame()
    }
  }, [items, loading])

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        gameId: 'memory',
        score: matches,
        maxScore: 6,
        timeTaken: (Date.now() - startTimeRef.current) / 1000,
        history: history,
      })
    }
  }

  const handleCardClick = (index: number) => {
    if (gameOver || won || loading) return
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
        setTimeout(() => {
          const matchedCards = [...cards]
          matchedCards[idx1].isMatched = true
          matchedCards[idx2].isMatched = true
          setCards(matchedCards)
          setFlippedIndices([])

          setHistory(prev => [...prev, { subject: card1.subject, correct: true }])

          const newMatchCount = matches + 1
          setMatches(newMatchCount)
          if (newMatchCount === cards.length / 2) {
            setWon(true)
          }
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  if (items.length < 6)
    return <div className="p-8 text-center text-gray-500">Not enough items to play.</div>

  if (gameOver || won) {
    return (
      <GameResults
        gameId="memory"
        score={matches}
        maxScore={6}
        timeTaken={(Date.now() - startTimeRef.current) / 1000}
        history={history}
        onNext={handleFinish}
        isLastGame={!propItems}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          {!propItems && (
            <Button variant="ghost" onClick={() => navigate('/session/games')}>
              <Icons.ChevronLeft />
            </Button>
          )}

          <h2 className="text-2xl font-bold text-gray-900 ml-2">Memory Match</h2>
        </div>
      </div>

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
                <img src={logo} className='size-12 opacity-40' />
              </div>

              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border-2 flex flex-col items-center justify-center p-2 text-center`}
              >
                {card.content.startsWith('http') ? (
                  <img src={card.content} className="w-16 h-16 object-contain" alt="" />
                ) : (
                  <span
                    className={`${card.type === 'character' ? 'text-4xl font-bold' : 'text-lg font-medium'}`}
                  >
                    {card.content}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`.rotate-y-180 { transform: rotateY(180deg); } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .perspective-1000 { perspective: 1000px; }`}</style>
    </div>
  )
}
