import React from 'react'
import { useNavigate } from 'react-router'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { useGames } from '../../hooks/useGames'

export const GameMenu: React.FC = () => {
  const navigate = useNavigate()

  const availableGames = useGames()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <Icons.ChevronLeft />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Mini Games</h1>
      </div>

      {/* Custom Game Banner */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/session/custom')}
          className="w-full bg-gradient-to-r from-gray-900 to-gray-700 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Icons.Adjustments className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold">Custom Session</h2>
              <p className="text-gray-300">Create your own game mix with specific filters.</p>
            </div>
          </div>
          <Icons.ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableGames.map(game => (
          <button
            key={game.id}
            onClick={() => navigate(`/session/games/${game.id}`)}
            className="flex items-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left group"
          >
            <div
              className={`p-4 rounded-xl mr-6 ${game.color} group-hover:scale-110 transition-transform`}
            >
              <game.icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{game.name}</h3>
              <p className="text-gray-500 mt-1 text-sm">{game.desc}</p>
            </div>
            <Icons.ChevronRight className="ml-2 text-gray-300 group-hover:text-indigo-500" />
          </button>
        ))}
      </div>
    </div>
  )
}
