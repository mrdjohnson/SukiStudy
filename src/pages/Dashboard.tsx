import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Summary } from '../types'
import { waniKaniService } from '../services/wanikaniService'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { useUser } from '../contexts/UserContext'
import { SimpleGrid, useMatches } from '@mantine/core'
import clsx from 'clsx'

export const Dashboard: React.FC = () => {
  const { user, isGuest } = useUser()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const gridWidth = useMatches({
    base: 1,
    sm: 3,
  })

  useEffect(() => {
    if (isGuest) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const data = await waniKaniService.getSummary()
        setSummary(data.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  const lessonsCount = summary?.lessons?.[0]?.subject_ids?.length || 0
  const reviewsCount = summary?.reviews?.[0]?.subject_ids?.length || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome {user!.username}!</h1>

          {!isGuest && (
            <p className="text-indigo-100 text-lg">
              You are on Level {user!.level}. Keep up the momentum.
            </p>
          )}
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
          <Icons.BookOpen size={300} />
        </div>
      </div>

      {/* Action Cards */}
      <SimpleGrid cols={isGuest ? 1 : gridWidth}>
        {!isGuest && (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
              <div className="bg-pink-100 p-4 rounded-full mb-4 group-hover:bg-pink-200 transition-colors">
                <Icons.Layers className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{lessonsCount} Lessons</h3>
              <p className="text-gray-500 mb-6">New items to learn</p>
              <Button
                variant={lessonsCount > 0 ? 'primary' : 'outline'}
                disabled={lessonsCount === 0}
                onClick={() => navigate('/session/lesson')}
              >
                Start Lessons
              </Button>
            </div>

            <div
              className={clsx(
                'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center',

                reviewsCount === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-indigo-200 transition-colors group',
              )}
            >
              <div className="bg-sky-100 p-4 rounded-full mb-4 group-hover:bg-sky-200 transition-colors">
                <Icons.RotateCcw className="w-8 h-8 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{reviewsCount} Reviews</h3>
              <p className="text-gray-500 mb-6">Items to recall</p>
              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
            <Icons.Gamepad2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Mini Games</h3>
          <p className="text-gray-500 mb-6">Review while having fun</p>
          <Button variant="outline" onClick={() => navigate('/session/games')}>
            Play Games
          </Button>
        </div>
      </SimpleGrid>

      {/* Quick Browse */}
      <div
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group cursor-pointer"
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
    </div>
  )
}
