import { sessions, results, subjects } from './db'
import { GameItem, Session, Result, GameItemStat } from '../types'
import _ from 'lodash'

export const offlineGameService = {
  /**
   * Save a completed game session to local history using normalized Session + Results
   */
  async saveGameSession(
    gameId: string,
    score: number,
    maxScore: number,
    timeTaken: number,
    history: GameItem[],
  ) {
    const sessionId = crypto.randomUUID()
    const now = Date.now()

    // Create session record
    const session: Session = {
      id: sessionId,
      gameId,
      startedAt: now - timeTaken * 1000, // Calculate start time from duration
      endedAt: now,
      score,
      maxScore,
    }

    await sessions.insert(session)

    // Create result records for each item
    const resultRecords: Omit<Result, 'id'>[] = history.map(item => ({
      sessionId,
      gameId, // Denormalized for easy querying
      subjectId: item.subject.id,
      assignmentId: item.assignment?.id,
      timestamp: now, // Approximate timestamps
      correctMeaning: !!item.correct,
      correctReading: !!item.correct,
      synced: !!item.subject.isKana, // Kana items are always "synced", others start as false
    }))

    results.insertMany(resultRecords)

    console.log(
      '[OfflineGameService] Saved session:',
      sessionId,
      'with',
      resultRecords.length,
      'results',
    )

    return { session, results: resultRecords }
  },

  async getStats() {
    const allSessions = sessions.find({}, { sort: { endedAt: -1 } }).fetch()

    const totalGames = allSessions.length
    const totalTime = allSessions.reduce(
      (acc, session) => acc + (session.endedAt - session.startedAt) / 1000,
      0,
    )
    const totalItems = _.chain(allSessions).flatMap('items.subjectId').uniq().size().value()

    const mostPlayed = _.chain(allSessions)
      .countBy('gameId')
      .toPairs()
      .maxBy(pair => pair[1])
      .value()

    const recentResults = results.find({}, { sort: { timestamp: -1 }, limit: 100 }).fetch()

    // Aggregate item history (recent 100 results)
    const itemHistory = recentResults
      .map(result => {
        const subject = subjects.findOne({ id: result.subjectId })
        if (!subject) return null

        return {
          subjectId: result.subjectId,
          gameId: result.gameId,
          timestamp: new Date(result.timestamp).toISOString(),
          characters: subject.characters || subject.slug,
          meaning: subject.meanings[0]?.meaning || '?',
          reading: subject.readings?.[0]?.reading || '',
          correct: result.correctMeaning && result.correctReading,
        }
      })
      .filter(Boolean)

    return {
      totalGames,
      totalTime,
      totalItems,
      mostPlayed: mostPlayed ? { gameId: mostPlayed[0], count: mostPlayed[1] } : null,
      history: allSessions,
      itemHistory,
    }
  },

  getItemStats(subjectId: number) {
    const allResults = results.find({ subjectId }, { sort: { timestamp: -1 } }).fetch()

    if (allResults.length === 0) return null

    const itemStat: GameItemStat = {
      lastReviewedAt: null,
      reviewCount: 0,
      correctCount: 0,
      averageScore: 0,
      lastGameId: null,
      gameCounts: {},
    }

    allResults.forEach(result => {
      if (result.correctMeaning && result.correctReading) {
        itemStat.correctCount++
      }

      itemStat.reviewCount++
      itemStat.gameCounts[result.gameId] = (itemStat.gameCounts[result.gameId] || 0) + 1
      itemStat.lastGameId = result.gameId
      itemStat.lastReviewedAt = new Date(result.timestamp).toISOString()
    })

    itemStat.averageScore = Math.round((itemStat.correctCount / itemStat.reviewCount) * 100)

    return itemStat
  },

  getAllItemStats() {
    // Sort results by timestamp to ensure lastGameId is correct
    const allResults = results.find({}, { sort: { timestamp: -1 } }).fetch()
    const itemStatsById: Record<number, GameItemStat> = {}

    allResults.forEach(result => {
      if (!itemStatsById[result.subjectId]) {
        itemStatsById[result.subjectId] = {
          lastReviewedAt: null,
          reviewCount: 0,
          correctCount: 0,
          averageScore: 0,
          lastGameId: null,
          gameCounts: {},
        }
      }

      const itemStat = itemStatsById[result.subjectId]
      if (result.correctMeaning && result.correctReading) {
        itemStat.correctCount++
      }

      itemStat.reviewCount++
      itemStat.gameCounts[result.gameId] = (itemStat.gameCounts[result.gameId] || 0) + 1
      itemStat.lastGameId = result.gameId
      itemStat.lastReviewedAt = new Date(result.timestamp).toISOString()
    })

    // Calculate averages
    Object.values(itemStatsById).forEach(s => {
      s.averageScore = Math.round((s.correctCount / s.reviewCount) * 100)
    })

    return itemStatsById
  },

  /**
   * Get a specific session with all its results
   */
  getSessionById(sessionId: string) {
    const session = sessions.findOne({ id: sessionId })
    if (!session) return null

    const sessionResults = results.find({ sessionId }).fetch()

    return {
      session,
      results: sessionResults,
    }
  },

  /**
   * Mark multiple results as synced
   */
  markResultsSynced(resultIds: string[]) {
    results.batch(() => {
      resultIds.forEach(id => {
        results.updateOne({ id }, { $set: { synced: true } })
      })
    })
  },
}
