import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { User, Summary } from '../types'
import { waniKaniService } from '../services/wanikaniService'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
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

  const handleReviewGame = () => {
    // Pick a random game to play as "Review"
    const games = ['memory', 'quiz', 'shiritori', 'sorting', 'connect', 'variations']
    const randomGame = games[Math.floor(Math.random() * games.length)]
    navigate(`/session/games/${randomGame}`)
  }

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

  const chartData = [
    { name: 'Mon', reviews: 45 },
    { name: 'Tue', reviews: 52 },
    { name: 'Wed', reviews: 38 },
    { name: 'Thu', reviews: 65 },
    { name: 'Fri', reviews: 48 },
    { name: 'Sat', reviews: 20 },
    { name: 'Sun', reviews: 15 },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.username}!</h1>
          <p className="text-indigo-100 text-lg">
            You are on Level {user.level}. Keep up the momentum.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
          <Icons.BookOpen size={300} />
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-sky-100 p-4 rounded-full mb-4 group-hover:bg-sky-200 transition-colors">
            <Icons.RotateCcw className="w-8 h-8 text-sky-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{reviewsCount} Reviews</h3>
          <p className="text-gray-500 mb-6">Items to recall</p>
          <div className="flex gap-2 w-full">
            <Button
              className="flex-1"
              variant={reviewsCount > 0 ? 'secondary' : 'outline'}
              disabled={reviewsCount === 0}
              onClick={() => navigate('/session/review')}
            >
              Start
            </Button>
            <Button
              variant="outline"
              disabled={reviewsCount === 0}
              onClick={handleReviewGame}
              title="Play Review Game"
            >
              <Icons.Gamepad2 className="w-5 h-5 text-sky-600" />
            </Button>
          </div>
        </div>

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
      </div>

      {/* Quick Browse */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Current Level Content</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/browse')}>
            Browse All <Icons.ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <Tooltip
                cursor={{ fill: '#f3f4f6' }}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="reviews" radius={[4, 4, 4, 4]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 3 ? '#4f46e5' : '#e5e7eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
