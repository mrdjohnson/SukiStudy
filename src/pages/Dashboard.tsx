import React, { useState, useEffect } from 'react'
import { useNetwork } from '@mantine/hooks'
import { useNavigate } from 'react-router'
import { assignments, encounters } from '../services/db'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { useUser } from '../contexts/UserContext'
import { Badge, Container, Group, SimpleGrid, useMatches } from '@mantine/core'
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
      <Container className="mx-auto max-w-full! space-y-4 md:space-y-8 py-4 md:py-8">
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-secondary/30 transition-colors group">
                <div className="bg-pink-100 p-4 rounded-full mb-4 group-hover:bg-pink-200 transition-colors">
                  <Icons.Layers className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{lessonsCount} Lessons</h3>
                <p className="text-gray-500 mb-6">New items to learn</p>
                <Button
                  variant={lessonsCount > 0 ? 'primary' : 'outline'}
                  disabled={lessonsCount === 0}
                  onClick={() => navigate('/session/lesson')}
                  className="w-36!"
                >
                  Start Lessons
                </Button>
              </div>

              <div
                className={clsx(
                  'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center',

                  reviewsCount === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-secondary/30 transition-colors group',
                )}
              >
                <div className="bg-sky-100 p-4 rounded-full mb-4 group-hover:bg-sky-200 transition-colors">
                  <Icons.RotateCcw className="w-8 h-8 text-sky-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{reviewsCount} Reviews</h3>
                <p className="text-gray-500 mb-6">Items to recall</p>
                <div>
                  <Button
                    className="flex-1 w-36!"
                    variant="light"
                    disabled={reviewsCount === 0}
                    onClick={() => navigate('/session/review')}
                    rightSection={<Icons.Gamepad2 className="w-5 h-5" />}
                  >
                    Start
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-secondary/30 transition-colors group">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
              <Icons.Gamepad2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Mini Games</h3>
            <p className="text-gray-500 mb-6">Review while having fun</p>
            <Button variant="outline" onClick={() => navigate('/session/games')} className="w-36!">
              Play Games
            </Button>
          </div>
        </SimpleGrid>

        {/* Statistics Link (Conditional) */}
        <div
          className={clsx(
            'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center',
            gameCount === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-secondary/30 transition-colors group  cursor-pointer',
          )}
          onClick={() => gameCount > 0 && navigate('/stats')}
        >
          <div className="bg-amber-100 p-4 rounded-full mb-4 group-hover:bg-amber-200 transition-colors cursor">
            <Icons.Activity className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Your Stats</h3>
          <p className="text-gray-500 mb-6">View your game history and item breakdown.</p>
        </div>

        {/* Quick Browse */}
        <div
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-secondary/30 transition-colors group cursor-pointer"
          onClick={() => navigate('/browse')}
        >
          <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
            <Icons.BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Browse Content</h3>
          <p className="text-gray-500 mb-6">
            Explore all kana, radicals, kanji, and vocabulary by level.
          </p>
        </div>
      </Container>

      <Footer />
    </>
  )
}
