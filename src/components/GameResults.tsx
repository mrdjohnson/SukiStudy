import { Icons } from './Icons'
import { Button } from './ui/Button'
import { openFlashcardModal } from './modals/FlashcardModal'
import { GameLogic } from '../hooks/useGameLogic'
import { GameItemIcon } from './GameItemIcon'
import { IconReload } from '@tabler/icons-react'
import { GameItem } from '../types'
import clsx from 'clsx'
import { Paper, Text } from '@mantine/core'

interface GameResultsProps<T extends GameItem> {
  gameLogic: GameLogic<T>
  isLastGame?: boolean
  isReview?: boolean
  onPlayAgain?: () => void
}

export const GameResults = <T extends GameItem>({
  gameLogic,
  isLastGame = true,
  isReview = false,
  onPlayAgain,
}: GameResultsProps<T>) => {
  const { game: gameInfo, gameState } = gameLogic
  const { maxScore, score, time: timeTaken, gameItems } = gameState

  const Icon = gameInfo ? gameInfo.icon : Icons.Trophy
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  return (
    <div className={clsx('max-w-2xl mx-auto animate-fade-in', isReview ? 'pb-6' : 'p-6')}>
      <div className="text-center mb-8">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${gameInfo?.color || 'bg-indigo-100 text-indigo-600'}`}
        >
          <Icon className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-2">
          {gameInfo.name} {isReview ? 'Results' : 'Complete!'}
        </h2>
        <div className="flex justify-center gap-6 mt-4 text-gray-600">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold ">{percentage}%</span>
            <span className="text-xs uppercase font-bold text-gray-400">Accuracy</span>
          </div>
          <div className="w-px bg-gray-200 h-10"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{timeTaken}</span>
            <span className="text-xs uppercase font-bold text-gray-400">Time</span>
          </div>
        </div>
      </div>

      <Paper withBorder shadow="sm" className="rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold">Review Summary</h3>
          <Text className="text-sm" c="dimmed">
            {gameItems.length} items
          </Text>
        </div>

        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {gameLogic.gameState.gameItems.map((item, idx) => (
            <button
              key={`${item.subject.id}-${idx}`}
              onClick={() =>
                openFlashcardModal(
                  gameLogic.gameState.gameItems.map(item => item.subject),
                  idx,
                )
              }
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <GameItemIcon subject={item.subject} />

                <div>
                  <div className="font-medium">{item.subject.meanings[0].meaning}</div>
                  <div className="text-xs">{item.subject.readings?.[0]?.reading}</div>
                </div>
              </div>

              <div
                className={clsx(
                  `px-3 py-1 rounded-full text-xs font-bold`,
                  item.correct
                    ? 'bg-green-100 text-green-700 dark:bg-green-300 dark:text-green-900'
                    : 'bg-red-100 text-red-700 dark:bg-red-300 dark:text-red-900',
                )}
              >
                {item.correct ? 'Correct' : 'Missed'}
              </div>
            </button>
          ))}
        </div>
      </Paper>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {onPlayAgain && (
          <Button
            size="lg"
            variant="outline"
            onClick={onPlayAgain}
            className="w-full sm:w-auto min-w-[200px]"
          >
            <IconReload className="mr-2 w-5 h-5" />
            Play Again
          </Button>
        )}

        <Button
          size="lg"
          onClick={gameLogic.finishGame}
          className="w-full sm:w-auto min-w-[200px]"
          hidden={isReview}
        >
          {isLastGame ? 'Finish Session' : 'Next Game'}
          <Icons.ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
