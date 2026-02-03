import React, { useMemo } from 'react'
import { EncounterItem } from '../types'
import moment from 'moment'
import _ from 'lodash'

interface ReviewHistoryChartProps {
  results: EncounterItem[]
}

export const ReviewHistoryChart: React.FC<ReviewHistoryChartProps> = ({ results }) => {
  // Group results by day and calculate daily accuracy
  const chartData = useMemo(() => {
    if (results.length === 0) return []

    // Sort by timestamp ascending (oldest first)
    const sortedResults = _.orderBy(results, ['timestamp'], ['asc'])

    // Group by day
    const grouped = _.groupBy(sortedResults, result => {
      return moment(result.timestamp).format('YYYY-MM-DD')
    })

    // Calculate stats for each day
    return Object.entries(grouped).map(([date, dayResults]) => {
      const correctCount = dayResults.filter(r => r.correctMeaning && r.correctReading).length
      const accuracy = Math.round((correctCount / dayResults.length) * 100)

      return {
        date,
        displayDate: moment(date).format('MMM D'),
        reviewCount: dayResults.length,
        accuracy,
        correctCount,
        incorrectCount: dayResults.length - correctCount,
      }
    })
  }, [results])

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No review history yet</div>
  }

  // Calculate chart dimensions
  const maxReviews = Math.max(...chartData.map(d => d.reviewCount))
  const chartHeight = 120

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
          <span>{maxReviews}</span>
          <span>{Math.round(maxReviews / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart bars */}
        <div className="ml-8 h-full flex items-end justify-between gap-1">
          {chartData.map(data => {
            const barHeight = (data.reviewCount / maxReviews) * chartHeight
            const correctHeight = (data.correctCount / data.reviewCount) * barHeight
            const incorrectHeight = (data.incorrectCount / data.reviewCount) * barHeight

            return (
              <div
                key={data.date}
                className="flex-1 flex flex-col justify-end group relative cursor-default"
                style={{ height: chartHeight }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                    <div className="font-semibold mb-1">{data.displayDate}</div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span>Correct: {data.correctCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span>Incorrect: {data.incorrectCount}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-1 mt-1">
                        Accuracy: {data.accuracy}%
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full rounded-t transition-all" style={{ height: barHeight }}>
                  {/* Correct portion (green) */}
                  <div
                    className="w-full bg-green-500 group-hover:bg-green-600 transition-colors"
                    style={{ height: correctHeight }}
                  />
                  {/* Incorrect portion (red) */}
                  <div
                    className="w-full bg-red-400 group-hover:bg-red-500 transition-colors"
                    style={{ height: incorrectHeight }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* X-axis line */}
        <div className="ml-8 h-px bg-gray-200 mt-1" />
      </div>

      {/* X-axis labels - show first, middle, and last */}
      <div className="ml-8 flex justify-between text-xs text-gray-500">
        <span>{chartData[0]?.displayDate}</span>
        {chartData.length > 2 && (
          <span className="hidden sm:inline">
            {chartData[Math.floor(chartData.length / 2)]?.displayDate}
          </span>
        )}
        <span>{chartData[chartData.length - 1]?.displayDate}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Correct</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span>Incorrect</span>
        </div>
      </div>
    </div>
  )
}
