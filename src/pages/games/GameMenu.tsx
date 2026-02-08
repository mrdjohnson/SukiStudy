import React from 'react'
import { useNavigate } from 'react-router'
import { Icons } from '../../components/Icons'
import { useGames } from '../../hooks/useGames'
import { ActionIcon, Container, Group, Title } from '@mantine/core'

export const GameMenu: React.FC = () => {
  const navigate = useNavigate()

  const availableGames = useGames()

  return (
    <Container size="md" className="mt-4">
      <Group className="gap-4 mb-8 justify-between! -mx-2 md:-mx-4">
        <ActionIcon variant="subtle" onClick={() => navigate('/')}>
          <Icons.ChevronLeft />
        </ActionIcon>

        <Title order={2}>Mini Games</Title>

        <div />
      </Group>

      {/* Custom Game Banner */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/session/custom')}
          className="w-full bg-linear-to-r from-gray-900 to-gray-700 text-white dark:text-gray-200 p-6 rounded-2xl shadow-lg flex items-center justify-between hover:scale-[1.01] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Icons.Adjustments className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold">Custom Session</h2>
              <p className="text-gray-400 mt-1 text-sm">
                Create your own game mix with specific filters.
              </p>
            </div>
          </div>
          <Icons.ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableGames.map(game => (
          <button
            key={game.id}
            onClick={() => navigate(`/session/games/${game.id}`)}
            className="flex items-center p-6 dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div
              className={`p-4 rounded-xl mr-6 ${game.color} group-hover:scale-110 transition-transform`}
            >
              <game.icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold ">{game.name}</h3>
              <p className="text-gray-400 mt-1 text-sm">{game.desc}</p>
            </div>
            <Icons.ChevronRight className="ml-2 text-gray-300 group-hover:text-indigo-500" />
          </button>
        ))}
      </div>
    </Container>
  )
}
