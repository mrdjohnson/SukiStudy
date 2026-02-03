import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { GameItem } from '../../types'
import { Button } from '../../components/ui/Button'

// Games
import { QuizGame } from './QuizGame'
import { MemoryGame } from './MemoryGame'
import { MatchingGame } from './MatchingGame'
import { ConnectGame } from './ConnectGame'
import { TypingGame } from './TypingGame'
import { AudioQuizGame } from './AudioQuizGame'
import { useUser } from '../../contexts/UserContext'
import _ from 'lodash'

export const CustomSession = () => {
  const { user } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    games,
    items,
    roundCount = 5,
  } = (location.state as { games: string[]; items: GameItem[]; roundCount?: number }) || {
    games: [],
    items: [],
  }

  const [gameQueue, setGameQueue] = useState<string[]>([])
  const [currentGame, setCurrentGame] = useState<string | null>(null)
  const [completedGames, setCompletedGames] = useState(0)

  useEffect(() => {
    if (!items || items.length === 0 || !games || games.length === 0) {
      navigate('/session/custom')
      return
    }

    const gameCount = Math.max(roundCount, games.length)
    const rounds = _.sampleSize(games, gameCount)

    setGameQueue(rounds)
    setCurrentGame(rounds[0])
  }, [])

  const handleGameComplete = () => {
    const nextIdx = completedGames + 1
    if (nextIdx < gameQueue.length) {
      setCompletedGames(nextIdx)
      setCurrentGame(gameQueue[nextIdx])
    } else {
      navigate('/session/custom')
    }
  }

  if (!currentGame) return null

  const commonProps = {
    user,
    items,
    onComplete: handleGameComplete,
    isLastGame: completedGames === gameQueue.length - 1,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/session/custom')}>
          Quit
        </Button>
        <div className="flex gap-1">
          {gameQueue.map((g, idx) => (
            <div
              key={idx}
              className={`h-2 w-8 rounded-full transition-colors ${idx === completedGames ? 'bg-indigo-600' : idx < completedGames ? 'bg-green-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="text-sm font-bold text-gray-500">
          Round {completedGames + 1} / {gameQueue.length}
        </div>
      </div>

      <div className="animate-fade-in">
        {currentGame === 'quiz' && <QuizGame {...commonProps} />}
        {currentGame === 'memory' && <MemoryGame {...commonProps} />}
        {currentGame === 'matching' && <MatchingGame {...commonProps} />}
        {currentGame === 'connect' && <ConnectGame {...commonProps} />}
        {currentGame === 'typing' && <TypingGame {...commonProps} />}
        {currentGame === 'audio' && <AudioQuizGame {...commonProps} />}
      </div>
    </div>
  )
}
