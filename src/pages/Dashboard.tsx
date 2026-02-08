import React, { useState, useEffect } from 'react'
import { useNetwork } from '@mantine/hooks'
import { useNavigate } from 'react-router'
import { assignments, encounters } from '../services/db'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { useUser } from '../contexts/UserContext'
import {
  ActionIcon,
  Badge,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Text,
  useMatches,
} from '@mantine/core'
import clsx from 'clsx'
import { DashboardMessageCarousel } from '../components/dashboard/DashboardMessageCarousel'

import useReactivity from '../hooks/useReactivity'

import { Footer } from '../components/Footer'

export const Dashboard: React.FC = () => {
  const { isGuest } = useUser()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { online } = useNetwork()
  const gridWidth = useMatches({
    base: 1,
    sm: 3,
  })

  const gameCount = useReactivity(() => encounters.find().count())

  useEffect(() => {
    assignments.isReady().then(() => setLoading(false))
  }, [])

  const lessonsCount = useReactivity(() => {
    return assignments
      .find({
        srs_stage: 0,
        hidden: false,
        unlocked_at: { $ne: null },
      })
      .count()
  })

  const reviewsCount = useReactivity(() => {
    const now = new Date().toISOString()

    return assignments
      .find({
        available_at: { $lte: now },
        hidden: false,
      })
      .count()
  })

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  return (
    <>
      <Container className="mx-auto max-w-full! space-y-4 md:space-y-8 px-0! md:px-2! py-4 md:py-8">
        <Group justify="flex-end" className="-mt-4 md:-mt-8 mb-2">
          {isGuest && (
            <Badge color="orange" variant="light" size="lg" radius="md">
              Guest
            </Badge>
          )}

          {!online && (
            <Badge color="red" variant="light" size="lg" radius="md">
              Offline
            </Badge>
          )}
        </Group>

        <DashboardMessageCarousel />

        {/* Action Cards */}
        <SimpleGrid cols={isGuest ? 1 : gridWidth}>
          {!isGuest && (
            <>
              <Paper
                withBorder
                shadow="md"
                radius="lg"
                className="p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:border-secondary/30 group dark:shadow-slate-500! dark:shadow-sm! transition-all ease-in-out duration-300"
              >
                <div className="bg-pink-100 dark:bg-pink-900 p-4 rounded-full mb-4 group-hover:bg-pink-200 dark:group-hover:bg-pink-800 transition-colors w-fit place-self-center">
                  <Icons.Layers className="w-8 h-8 text-pink-600 dark:text-pink-300 dark:group-hover:text-pink-200" />
                </div>

                <h3 className="text-xl font-bold mb-1">{lessonsCount} Lessons</h3>
                <Text c="dimmed">New items to learn</Text>
                <Button
                  variant={lessonsCount > 0 ? 'primary' : 'outline'}
                  disabled={lessonsCount === 0}
                  onClick={() => navigate('/session/lesson')}
                  className="w-36! mt-6"
                >
                  Start Lessons
                </Button>
              </Paper>

              <Paper
                withBorder
                shadow="md"
                radius="lg"
                className={clsx(
                  'p-6 rounded-2xl flex flex-col items-center justify-center text-center',

                  reviewsCount === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-secondary/30 transition-colors group',
                )}
              >
                <div className="bg-sky-100 dark:bg-sky-900 p-4 rounded-full mb-4 group-hover:bg-sky-200 dark:group-hover:bg-sky-800 w-fit place-self-center transition-all ease-in-out duration-300">
                  <Icons.RotateCcw className="w-8 h-8 text-sky-600 dark:text-sky-300 dark:group-hover:text-sky-200" />
                </div>

                <h3 className="text-xl font-bold mb-1">{reviewsCount} Reviews</h3>
                <Text c="dimmed">Items to recall</Text>

                <div>
                  <Button
                    className="flex-1 w-36! mt-6"
                    variant="light"
                    disabled={reviewsCount === 0}
                    onClick={() => navigate('/session/review')}
                    rightSection={<Icons.Gamepad2 className="w-5 h-5" />}
                  >
                    Start
                  </Button>
                </div>
              </Paper>
            </>
          )}

          <Paper
            withBorder
            shadow="md"
            radius="lg"
            className="p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:border-secondary/30 group dark:shadow-slate-500! dark:shadow-sm! transition-all ease-in-out duration-300"
          >
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors w-fit place-self-center">
              <Icons.Gamepad2 className="w-8 h-8 text-green-600 dark:text-green-300 dark:group-hover:text-green-200" />
            </div>

            <h3 className="text-xl font-bold mb-1">Mini Games</h3>
            <Text c="dimmed">Review while having fun</Text>

            <Button
              variant="outline"
              onClick={() => navigate('/session/games')}
              className="w-36! mt-6"
            >
              Play Games
            </Button>
          </Paper>
        </SimpleGrid>

        {/* Statistics Link (Conditional) */}
        <Paper
          withBorder
          shadow="md"
          radius="lg"
          className={clsx(
            'p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all ease-in-out duration-300',
            gameCount === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-secondary/30 group  cursor-pointer dark:shadow-amber-800! dark:shadow-sm! dark:hover:shadow-md! ',
          )}
          onClick={() => gameCount > 0 && navigate('/stats')}
        >
          <div className="bg-amber-100 dark:bg-amber-900 p-4 rounded-full mb-4 group-hover:bg-amber-200 dark:group-hover:bg-amber-800 w-fit place-self-center ">
            <Icons.Activity className="w-8 h-8 text-amber-600 dark:text-amber-300 dark:group-hover:text-amber-200" />
          </div>
          <h3 className="text-xl font-bold mb-1">Your Stats</h3>
          <Text c="dimmed">View your game history and item breakdown.</Text>
        </Paper>

        {/* Quick Browse */}
        <Paper
          withBorder
          shadow="md"
          radius="lg"
          className="p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:border-secondary/30 group cursor-pointer dark:shadow-blue-800! dark:shadow-sm! dark:hover:shadow-md! transition-all ease-in-out duration-300"
          onClick={() => navigate('/browse')}
        >
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors w-fit place-self-center">
            <Icons.BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-300 dark:group-hover:text-blue-200" />
          </div>

          <h3 className="text-xl font-bold mb-1">Browse Content</h3>
          <Text c="dimmed">Explore all kana, radicals, kanji, and vocabulary by level.</Text>
        </Paper>
      </Container>

      <Footer />
    </>
  )
}
