import { useState, useEffect, useMemo, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { GameItem } from '../../types'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/PageLoader'

import { useUser } from '../../contexts/UserContext'
import _ from 'lodash'
import { games } from '../../utils/games'

export const CustomSession = () => {
  const { user } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    games: gameIds,
    items,
    roundCount = 5,
  } = (location.state as { games: string[]; items: GameItem[]; roundCount?: number }) || {
    games: [],
    items: [],
  }

  const [gameQueue, setGameQueue] = useState<string[]>([])
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)
  const [completedGames, setCompletedGames] = useState(0)

  useEffect(() => {
    if (!items || items.length === 0 || !gameIds || gameIds.length === 0) {
      navigate('/session/custom')
      return
    }

    const gameCount = Math.max(roundCount, gameIds.length)
    const rounds = _.sampleSize(gameIds, gameCount)

    setGameQueue(rounds)
    setCurrentGameId(rounds[0])
  }, [])

  const handleGameComplete = () => {
    const nextIdx = completedGames + 1
    if (nextIdx < gameQueue.length) {
      setCompletedGames(nextIdx)
      setCurrentGameId(gameQueue[nextIdx])
    } else {
      navigate('/session/custom')
    }
  }

  const GameComponent = useMemo(() => {
    return games.find(g => g.id === currentGameId)?.component
  }, [currentGameId])

  if (!GameComponent) return null

  const commonProps = {
    user,
    items,
    onComplete: handleGameComplete,
    isLastGame: completedGames === gameQueue.length - 1,
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <div className="px-4 py-8 ">
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
            Game {completedGames + 1} / {gameQueue.length}
          </div>
        </div>

        <div className="animate-fade-in w-full">
          <GameComponent {...commonProps} />
        </div>
      </div>
    </Suspense>
  )
}
