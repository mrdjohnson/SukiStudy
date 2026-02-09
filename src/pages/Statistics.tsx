import { useEffect, useMemo, useState } from 'react'
import { Tabs, Modal, SimpleGrid, Container, Title, Group, Badge, Text, Paper } from '@mantine/core'
import { useDebouncedState, useElementSize, useViewportSize } from '@mantine/hooks'
import { useNavigate } from 'react-router'
import moment from 'moment'
import _ from 'lodash'
import { IconCheck, IconX } from '@tabler/icons-react'

import { assignments, encounterItems, subjects } from '../services/db'
import { encounterService } from '../services/encounterService'

import { Encounter, GameItem } from '../types'
import { games } from '../utils/games'

import { Icons } from '../components/Icons'
import { openFlashcardModal } from '../components/modals/FlashcardModal'
import { GameResults } from '../components/GameResults'
import { GameItemIcon } from '../components/GameItemIcon'

import { GameLogic } from '../hooks/useGameLogic'
import useReactivity from '../hooks/useReactivity'
import clsx from 'clsx'

export interface ItemHistoryEntry {
  subjectId: number
  gameId: string
  timestamp: string
  characters: string
  meaning: string
  reading: string
  correct: boolean
}

export const Statistics = () => {
  const [selectedGame, setSelectedGame] = useState<Encounter | null>(null)
  const navigate = useNavigate()

  const { ref, height } = useElementSize()

  const { height: viewportHeight } = useViewportSize()
  const [tabHeight, setTabHeight] = useDebouncedState(0, 200)

  useEffect(() => {
    setTabHeight(0)
  }, [viewportHeight])

  useEffect(() => {
    setTabHeight(height - 3)
  }, [height])

  const stats = useReactivity(() => {
    return encounterService.getStats()
  }, [])

  const handleGameClick = (game: Encounter) => {
    setSelectedGame(game)
  }

  const handleItemClick = (subjectId: number) => {
    const subject = subjects.findOne({ id: subjectId })
    if (subject) {
      openFlashcardModal([subject])
    }
  }

  const handlePlayAgain = () => {
    if (!selectedGame || selectedGameItems.length === 0) return

    // get assignments for selected game items
    const assignmentById = _.chain(selectedGameItems)
      .map('assignmentId')
      .uniq()
      .compact()
      .thru(assignmentIds => {
        if (_.isEmpty(assignmentIds)) {
          return []
        }

        return assignments.find({ id: { $in: assignmentIds } }).fetch()
      })
      .keyBy('id')
      .value()

    // Convert encounter items to game items format
    const gameItems: GameItem[] = selectedGameItems.map(item => {
      const assignment = assignmentById[item.assignmentId || '']

      return {
        subject: item.subject,
        assignment,
        isReviewable: moment(assignment.available_at).isBefore(),
      }
    })

    // Close the modal
    setSelectedGame(null)

    // Navigate to the game with the same items
    navigate(`/session/custom/play`, {
      state: { games: [selectedGame.gameId], items: gameItems, roundCount: 1 },
    })
  }

  const selectedGameItems = useReactivity(() => {
    if (!selectedGame) return []

    const items = encounterItems.find({ sessionId: selectedGame.id }).fetch()
    const subjectIds = items.map(item => item.subjectId)
    const itemSubjects = subjects.find({ id: { $in: subjectIds } }).fetch()
    const subjectsById = _.keyBy(itemSubjects, 'id')

    return _.chain(items)
      .map(item => {
        const subject = subjectsById[item.subjectId]
        if (!subject) return null

        return {
          ...item,
          subject,
        }
      })
      .compact()
      .value()
  }, [selectedGame])

  // Construct mock game logic for the results view
  const selectedGameLogic: null | GameLogic<GameItem> = useMemo(() => {
    if (!selectedGame) return null

    const duration = moment.duration((selectedGame.endedAt - selectedGame.startedAt) / 1000)

    const timeTakenHours = duration.hours()
    const timeTakenMinutes = duration.minutes()
    const timeTakenSeconds = duration.seconds()

    let timeTaken

    if (timeTakenHours > 0) {
      timeTaken = `${timeTakenHours}:${String(timeTakenMinutes).padStart(2, '0')}:${String(timeTakenSeconds).padStart(2, '0')}`
    } else if (timeTakenMinutes > 0) {
      timeTaken = `${timeTakenMinutes}:${String(timeTakenSeconds).padStart(2, '0')}`
    } else {
      timeTaken = `${timeTakenSeconds}s`
    }

    const game = games.find(g => g.id === selectedGame.gameId)

    if (!game) return null

    const logic: GameLogic<GameItem> = {
      game,
      gameState: {
        score: selectedGame.score,
        maxScore: selectedGame.maxScore,
        time: timeTaken,
        gameItems: selectedGameItems.map(item => ({
          subject: item.subject,
          correct: item.correctMeaning && item.correctReading,
        })),
        gameId: game.id,
        isActive: false,
        isFinished: true,
        startTime: selectedGame.startedAt,
        roundNumber: 0,
        maxRoundNumber: 0,
      },
      isAnswerIncorrect: false,
      canSkip: false,
      isWaitingForNextRound: false,
      finishGame: () => setSelectedGame(null),

      startGame: _.noop,
      recordAttempt: _.noop,
      skip: _.noop,
      finishRound: _.noop,
      setGameItems: _.noop,
      endGame: _.noop,
      setMaxScore: _.noop,
    }

    return logic
  }, [selectedGameItems, selectedGame])

  if (!stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  }

  return (
    <Container className="space-y-4! md:space-y-8! px-0! sm:px-2! md:px-4! flex flex-col flex-1">
      <Title order={2}>Statistics</Title>
      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 2, xs: 4 }}>
        <Paper radius="lg" shadow="sm" p={{ base: 'sm', sm: 'lg' }} withBorder>
          <Text tt="uppercase" c="dimmed" size="sm">
            Total Games
          </Text>
          <Title order={2}>{stats.totalGames}</Title>
        </Paper>

        <Paper radius="lg" shadow="sm" p={{ base: 'sm', sm: 'lg' }} withBorder>
          <Text tt="uppercase" c="dimmed" size="sm">
            Total Time
          </Text>
          <Title order={2}>{stats.totalTime}</Title>
        </Paper>

        <Paper radius="lg" shadow="sm" p={{ base: 'sm', sm: 'lg' }} withBorder>
          <Text tt="uppercase" c="dimmed" size="sm">
            Items Reviewed
          </Text>
          <Title order={2}>{stats.totalUniqueResults}</Title>
        </Paper>

        <Paper radius="lg" shadow="sm" p={{ base: 'sm', sm: 'lg' }} withBorder>
          <Text tt="uppercase" c="dimmed" size="sm">
            Most Played
          </Text>
          <Title order={4}>{stats.mostPlayed?.gameName || '—'}</Title>
          <Text c="dimmed">{stats.mostPlayed?.count}</Text>
        </Paper>
      </SimpleGrid>

      <Paper
        radius="lg"
        className="flex-1 min-h-0! overflow-hidden!"
        ref={ref}
        withBorder
        shadow="sm"
      >
        <div style={{ height: `${tabHeight}px` }}>
          <Tabs h="100%" defaultValue="games" className="overflow-hidden flex-1 flex! flex-col!">
            <Tabs.List className="px-6 pt-4">
              <Tabs.Tab value="games" leftSection={<Icons.Gamepad2 size={16} />}>
                Recent Games
              </Tabs.Tab>
              <Tabs.Tab value="items" leftSection={<Icons.ListCheck size={16} />}>
                Recent Items
              </Tabs.Tab>
            </Tabs.List>

            {/* Games */}
            <Tabs.Panel value="games" className="max-h-full">
              <div className="divide-y divide-gray-100 dark:divide-gray-500 max-h-full overflow-y-auto">
                {stats.history.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No games played yet.</div>
                ) : (
                  stats.history.map(session => (
                    <div
                      key={session.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => handleGameClick(session)}
                    >
                      <div className="flex items-center gap-4">
                        <session.game.icon
                          className={clsx('size-9 rounded-md p-1', session.game.color)}
                        />

                        <div>
                          <div className="font-medium capitalize">{session.gameId}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.startedAt).toLocaleDateString()}{' '}
                            {new Date(session.endedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {session.maxScore > 0 && (
                          <div className="text-center">
                            <div className="font-bold">
                              {session.score} / {session.maxScore}
                            </div>
                            <div className="text-xs text-gray-500">Score</div>
                          </div>
                        )}

                        <div className="text-center hidden sm:block">
                          <div className="font-medium text-gray-700">{session.timeTaken}</div>
                          <div className="text-xs text-gray-500">Time</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Tabs.Panel>

            {/* Items */}
            <Tabs.Panel value="items" className="max-h-full overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-500 max-h-full overflow-y-auto">
                {!stats.itemHistory || stats.itemHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No items reviewed yet.</div>
                ) : (
                  stats.itemHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer gap-2"
                      onClick={() => handleItemClick(item.subjectId)}
                    >
                      <div className="flex items-center gap-4">
                        <GameItemIcon subject={item} />

                        <div className="flex-1 min-w-0">
                          <Group gap="xs" align="center" mb={4}>
                            <Text fw={700} truncate>
                              {item.meanings?.[0]?.meaning}
                            </Text>
                            <Group gap={4}>
                              {item.readings
                                ?.filter(r => r.primary)
                                .map((r, i) => (
                                  <Badge
                                    key={i}
                                    size="sm"
                                    variant="dot"
                                    color="gray"
                                    className="bg-gray-200! dark:bg-gray-700! before:bg-black! dark:before:bg-gray-500!"
                                  >
                                    {r.reading}
                                  </Badge>
                                ))}
                            </Group>
                          </Group>

                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {item.meanings
                              ?.slice(1)
                              .map(m => m.meaning)
                              .join(', ')}
                          </Text>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-6 flex-col sm:flex-row">
                        <div className="text-sm text-gray-500 hidden sm:block">
                          via <span className="capitalize font-medium">{item.gameId}</span>
                        </div>

                        <div className="text-xs text-gray-400">
                          {moment(item.timestamp).format('MMM D')}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.correct
                              ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                          }`}
                        >
                          {item.correct ? <IconCheck size={16} /> : <IconX size={16} />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      </Paper>

      <Modal
        opened={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        size="xl"
        centered
        styles={{ body: { padding: 0 } }}
      >
        {selectedGameLogic && (
          <GameResults
            gameLogic={selectedGameLogic}
            isLastGame={false} // Hide "Next Game" button text, shows "Finish Session" or we customize via key
            onPlayAgain={handlePlayAgain}
            isReview
          />
        )}
      </Modal>
    </Container>
  )
}
