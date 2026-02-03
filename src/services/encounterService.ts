import { encounters, encounterItems, subjects } from './db'
import { GameItem, Encounter, EncounterItem, GameItemStat } from '../types'
import _ from 'lodash'
import moment from 'moment'
import { games } from '../utils/games'
import { formatDuration, formatTime } from '../utils/formatTime'

export const encounterService = {
  /**
   * Save a completed game encounter to local history using normalized Encounter + EncounterItems
   */
  async saveEncounter(
    gameId: string,
    score: number,
    maxScore: number,
    timeTaken: number,
    history: GameItem[],
  ) {
    const encounterId = crypto.randomUUID()
    const now = Date.now()

    // Create encounter record
    const encounter: Encounter = {
      id: encounterId,
      gameId,
      startedAt: now - timeTaken * 1000, // Calculate start time from duration
      endedAt: now,
      score,
      maxScore,
    }

    await encounters.insert(encounter)

    // Create encounter item records for each item
    const encounterItemRecords: Omit<EncounterItem, 'id'>[] = history.map(item => ({
      sessionId: encounterId,
      gameId, // Denormalized for easy querying
      subjectId: item.subject.id,
      assignmentId: item.assignment?.id,
      timestamp: now, // Approximate timestamps
      correctMeaning: !!item.correct,
      correctReading: !!item.correct,
      synced: !!item.subject.isKana, // Kana items are always "synced", others start as false
    }))

    encounterItems.insertMany(encounterItemRecords)

    console.log(
      '[EncounterService] Saved encounter:',
      encounterId,
      'with',
      encounterItemRecords.length,
      'items',
    )

    return { encounter, encounterItems: encounterItemRecords }
  },

  /**
   * Mark multiple encounter items as synced
   */
  markEncounterItemsSynced(encounterItemIds: string[]) {
    encounterItems.batch(() => {
      encounterItemIds.forEach(id => {
        encounterItems.updateOne({ id }, { $set: { synced: true } })
      })
    })
  },

  getStats() {
    const allEncounters = encounters
      .find({}, { sort: { endedAt: -1 } })
      .fetch()
      .map(encounter => ({
        ...encounter,
        timeTaken: formatTime(encounter.startedAt, encounter.endedAt),
      }))

    const totalGames = allEncounters.length
    const totalTime = _.chain(allEncounters)
      .sumBy(session => (session.endedAt - session.startedAt) / 1000)
      .thru(formatDuration)
      .value()

    console.log({ totalTime })

    const encounterItemIds = encounterItems.find({}, { fields: { subjectId: 1 } }).fetch()
    const totalUniqueResults = _.chain(encounterItemIds).map('subjectId').uniq().size().value()

    const mostPlayed = _.chain(allEncounters)
      .countBy('gameId')
      .toPairs()
      .maxBy(pair => pair[1])
      .value()

    const recentItems = encounterItems.find({}, { sort: { timestamp: -1 }, limit: 100 }).fetch()
    const subjectsById = _.keyBy(
      subjects.find({ id: { $in: recentItems.map(item => item.subjectId) } }).fetch(),
      'id',
    )

    // Aggregate item history (recent 100 results)
    const itemHistory = _.chain(recentItems)
      .map(result => {
        const subject = subjectsById[result.subjectId]
        if (!subject) return null

        return {
          subjectId: result.subjectId,
          gameId: result.gameId,
          timestamp: new Date(result.timestamp).toISOString(),
          correct: result.correctMeaning && result.correctReading,
          ...subject,
        }
      })
      .compact()
      .value()

    const gamesById = _.keyBy(games, 'id')

    const history = allEncounters.map(session => {
      const game = gamesById[session.gameId]

      if (!game) return null

      return {
        ...session,
        game,
      }
    })

    return {
      totalGames,
      totalTime,
      totalUniqueResults,
      mostPlayed: mostPlayed ? { gameId: mostPlayed[0], count: mostPlayed[1] } : null,
      history: _.compact(history),
      itemHistory,
    }
  },

  getItemStats(subjectId: number) {
    const allEncounterItems = encounterItems
      .find({ subjectId }, { sort: { timestamp: -1 } })
      .fetch()

    if (allEncounterItems.length === 0) return null

    const itemStat: GameItemStat = {
      lastReviewedAt: null,
      reviewCount: 0,
      correctCount: 0,
      averageScore: 0,
      lastGameId: null,
      gameCounts: {},
    }

    allEncounterItems.forEach(result => {
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
    const allEncounterItems = encounterItems.find({}, { sort: { timestamp: -1 } }).fetch()
    const itemStatsById: Record<number, GameItemStat> = {}

    allEncounterItems.forEach(item => {
      if (!itemStatsById[item.subjectId]) {
        itemStatsById[item.subjectId] = {
          lastReviewedAt: null,
          reviewCount: 0,
          correctCount: 0,
          averageScore: 0,
          lastGameId: null,
          gameCounts: {},
        }
      }

      const itemStat = itemStatsById[item.subjectId]
      if (item.correctMeaning && item.correctReading) {
        itemStat.correctCount++
      }

      itemStat.reviewCount++
      itemStat.gameCounts[item.gameId] = (itemStat.gameCounts[item.gameId] || 0) + 1
      itemStat.lastGameId = item.gameId
      itemStat.lastReviewedAt = new Date(item.timestamp).toISOString()
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
  getEncounterById(sessionId: string) {
    const encounter = encounters.findOne({ id: sessionId })
    if (!encounter) return null

    const items = encounterItems.find({ sessionId }).fetch()

    return {
      session: encounter,
      items,
    }
  },
}
