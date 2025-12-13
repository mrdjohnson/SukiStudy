import React from 'react'
import { Icons } from './Icons'
import { Button } from './ui/Button'
import { openFlashcardModal } from './modals/FlashcardModal'
import { GameLogic } from '../hooks/useGameLogic'
import moment from 'moment'

interface GameResultsProps {
  gameLogic: GameLogic
  isLastGame?: boolean
}

export const GameResults: React.FC<GameResultsProps> = ({ gameLogic, isLastGame = true }) => {
  const { game: gameInfo, gameState } = gameLogic
  const { maxScore, score, time: timeTaken, gameItems } = gameState

  const Icon = gameInfo ? gameInfo.icon : Icons.Trophy
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  const formatTime = (seconds: number) => {
    const duration = moment.duration(seconds * 1000)
    const m = duration.minutes()
    const s = duration.seconds()
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${gameInfo?.color || 'bg-indigo-100 text-indigo-600'}`}
        >
          <Icon className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {gameInfo?.name || 'Game'} Complete!
        </h2>
        <div className="flex justify-center gap-6 mt-4 text-gray-600">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-indigo-600">{percentage}%</span>
            <span className="text-xs uppercase font-bold text-gray-400">Accuracy</span>
          </div>
          <div className="w-px bg-gray-200 h-10"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-800">{timeTaken}</span>
            <span className="text-xs uppercase font-bold text-gray-400">Time</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Review Summary</h3>
          <span className="text-sm text-gray-500">{gameItems.length} items</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {gameLogic.gameState.gameItems.map((item, idx) => (
            <button
              key={`${item.subject.id}-${idx}`}
              onClick={() => openFlashcardModal(item.subject)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xl font-bold shadow-sm">
                  {item.subject.characters || (
                    <div className="w-6 h-6">
                      <img
                        src={
                          item.subject.character_images?.find(
                            i => i.content_type === 'image/svg+xml',
                          )?.url
                        }
                        className="w-full h-full"
                        alt=""
                      />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {item.subject.meanings[0].meaning}
                  </div>
                  <div className="text-xs text-gray-500">{item.subject.readings?.[0]?.reading}</div>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {item.correct ? 'Correct' : 'Missed'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button size="lg" onClick={gameLogic.finishGame} className="w-full sm:w-auto min-w-[200px]">
          {isLastGame ? 'Finish Session' : 'Next Game'}
          <Icons.ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
