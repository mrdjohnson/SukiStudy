import React, { useMemo, useState } from 'react'
import { EncounterItem } from '../types'
import moment from 'moment'
import _ from 'lodash'
import { DatePickerInput } from '@mantine/dates'
import { BarChart } from '@mantine/charts'
import { formatTimeRange } from '../utils/formatTime'

interface ReviewHistoryChartProps {
  results: EncounterItem[]
}

export const ReviewHistoryChart: React.FC<ReviewHistoryChartProps> = ({ results }) => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    moment().subtract(6, 'days').format('YYYY-MM-DD'),
    moment().format('YYYY-MM-DD'),
  ])

  // Determine granularity based on date range
  const granularity = useMemo(() => {
    const [start, end] = dateRange
    if (!start || !end) return 'day'

    const diffDays = moment(end).diff(moment(start), 'days')
    if (diffDays <= 8) return 'day'
    if (diffDays <= 65) return 'week'
    return 'month'
  }, [dateRange])

  // Filter results based on date range
  const filteredResults = useMemo(() => {
    const [startDate, endDate] = dateRange

    let start = moment(startDate)
    let end = moment(endDate)

    // Expand range to cover full granularity units
    if (granularity === 'month') {
      start = start.startOf('month')
      end = end.endOf('month')
    } else if (granularity === 'week') {
      start = start.startOf('week')
      end = end.endOf('week')
    } else {
      start = start.startOf('day')
      end = end.endOf('day')
    }

    return results
      .filter(result => {
        const resultDate = moment(result.timestamp)
        // Use inclusive comparison
        return resultDate.isBetween(start, end, undefined, '[]')
      })
      .map(result => ({
        ...result,
        displayDate: formatTimeRange(moment(result.timestamp), granularity),
      }))
  }, [results, dateRange, granularity])

  // Group results and prepare chart data
  const chartData = useMemo(() => {
    const [startDate, endDate] = dateRange

    const start = moment(startDate)
    const end = moment(endDate)
    const sortedResults = _.orderBy(filteredResults, ['timestamp'], ['asc'])

    // Group actual results
    const grouped = _.groupBy(sortedResults, 'displayDate')

    // Generate complete timeline
    const data = []
    const current = start.clone().startOf(granularity)

    while (current.isSameOrBefore(end)) {
      let displayDate = formatTimeRange(current, granularity)

      const [correct, incorrect] = _.partition(
        grouped[displayDate] || [],
        r => r.correctMeaning && r.correctReading,
      )

      data.push({
        date: displayDate,
        correct: correct.length,
        incorrect: incorrect.length,
      })

      current.add(1, granularity)
    }

    return data
  }, [filteredResults, granularity, dateRange])

  const today = moment()

  return (
    <div className="space-y-4">
      {/* Date Range Controls */}
      <div className="space-y-3">
        <DatePickerInput
          type="range"
          placeholder="Pick date range"
          value={dateRange}
          onChange={([start, end]) => start && end && setDateRange([start, end])}
          size="xs"
          maxDate={new Date()}
          presets={[
            {
              value: [moment().subtract(6, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
              label: 'Last 7 days',
            },
            {
              value: [
                moment().subtract(30, 'day').format('YYYY-MM-DD'),
                today.format('YYYY-MM-DD'),
              ],
              label: 'Last 30 days',
            },
            {
              value: [moment().startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
              label: 'This month',
            },
            {
              value: [
                moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
                moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
              ],
              label: 'Last month',
            },
            {
              value: [
                moment().subtract(3, 'months').format('YYYY-MM-DD'),
                today.format('YYYY-MM-DD'),
              ],
              label: 'Last 3 months',
            },
            {
              value: [moment().startOf('year').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
              label: 'This Year',
            },
            {
              value: [moment('2026-01-01').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
              label: 'All time', // we might be able to set this up based on complete item history
            },
          ]}
          clearable
        />
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No review history for selected time period
        </div>
      ) : (
        <div className="w-full">
          <BarChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              { name: 'correct', color: 'teal.5', label: 'Correct' },
              { name: 'incorrect', color: 'red.5', label: 'Incorrect' },
            ]}
            type="stacked"
            tickLine="y"
            gridAxis="y"
            withTooltip
            tooltipAnimationDuration={200}
            xAxisProps={{ tickMargin: 10 }}
          />
        </div>
      )}
    </div>
  )
}
