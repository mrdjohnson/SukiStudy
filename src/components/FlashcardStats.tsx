import React, { Suspense } from 'react'
import { Loader } from '@mantine/core'
import { encounterService } from '../services/encounterService'

const ReviewHistoryChart = React.lazy(() => import('./ReviewHistoryChart'))

type ItemStats = NonNullable<ReturnType<typeof encounterService.getItemStats>>

export const FlashcardStats = ({ stats }: { stats: ItemStats }) => (
  <div>
    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
      Your Stats
    </h3>
    <div className="border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.reviewCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Games</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.averageScore}%</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {stats.lastGameId ? <span className="capitalize">{stats.lastGameId}</span> : '-'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Last Game</div>
        </div>
      </div>

      {stats.history.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Review History
          </h4>
          <Suspense
            fallback={
              <div className="h-32 flex items-center justify-center">
                <Loader size="sm" />
              </div>
            }
          >
            <ReviewHistoryChart results={stats.history} />
          </Suspense>
        </div>
      )}
    </div>
  </div>
)
