import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { GameItem, GameResultData } from '../../types'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'

// Games
import { QuizGame } from './QuizGame'
import { MemoryGame } from './MemoryGame'
import { MatchingGame } from './MatchingGame'
import { ConnectGame } from './ConnectGame'
import { TypingGame } from './TypingGame'
import { AudioQuizGame } from './AudioQuizGame'
import { GameResults } from '../../components/GameResults'
import { useUser } from '../../contexts/UserContext'

export const CustomSession = () => {
  const { user } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  const { games, items } = (location.state as { games: string[]; items: GameItem[] }) || {
    games: [],
    items: [],
  }

  const [gameQueue, setGameQueue] = useState<string[]>([])
  const [currentGame, setCurrentGame] = useState<string | null>(null)
  const [completedGames, setCompletedGames] = useState(0)
  const [results, setResults] = useState<GameResultData[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [summaryIndex, setSummaryIndex] = useState(0)

  useEffect(() => {
    if (!items || items.length === 0 || !games || games.length === 0) {
      navigate('/session/custom')
      return
    }

    // Build a queue of 5 rounds (or fewer if less games selected)
    const rounds = []
    const roundCount = Math.max(games.length, 5)
    for (let i = 0; i < roundCount; i++) {
      rounds.push(games[i % games.length])
    }
    setGameQueue(rounds)
    setCurrentGame(rounds[0])
  }, [])

  const handleGameComplete = (resultData?: GameResultData) => {
    if (resultData) {
      setResults(prev => [...prev, resultData])
    }

    const nextIdx = completedGames + 1
    if (nextIdx < gameQueue.length) {
      setCompletedGames(nextIdx)
      setCurrentGame(gameQueue[nextIdx])
    } else {
      // All Done, show summary
      setShowSummary(true)
    }
  }

  if (showSummary) {
    const currentResult = results[summaryIndex]
    const hasNext = summaryIndex < results.length - 1
    const hasPrev = summaryIndex > 0

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/session/games')}>
            <Icons.X className="w-5 h-5 mr-2" /> Exit
          </Button>
          <h1 className="text-2xl font-bold">Session Summary</h1>
          <div className="w-20"></div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSummaryIndex(i => i - 1)}
            disabled={!hasPrev}
            className={`p-2 rounded-full hover:bg-gray-100 ${!hasPrev ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <Icons.ChevronLeft className="w-8 h-8" />
          </button>

          <div className="flex-1 transition-all duration-300 transform">
            {currentResult ? (
              <GameResults
                gameId={currentResult.gameId}
                score={currentResult.score}
                maxScore={currentResult.maxScore}
                timeTaken={currentResult.timeTaken}
                history={currentResult.history}
                onNext={() => navigate('/session/games')}
                isLastGame={true} // In summary view, the button action is customized or ignored
              />
            ) : (
              <div className="text-center p-8">No results recorded.</div>
            )}
          </div>

          <button
            onClick={() => setSummaryIndex(i => i + 1)}
            disabled={!hasNext}
            className={`p-2 rounded-full hover:bg-gray-100 ${!hasNext ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <Icons.ChevronRight className="w-8 h-8" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {results.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${idx === summaryIndex ? 'bg-indigo-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        {!hasNext && (
          <div className="text-center mt-8">
            <Button size="lg" onClick={() => navigate('/session/games')}>
              Finish Session
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (!currentGame) return null

  const commonProps = {
    user,
    items,
    onComplete: handleGameComplete,
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
