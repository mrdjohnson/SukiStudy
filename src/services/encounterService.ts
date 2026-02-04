import { encounters, encounterItems } from './db'
import { GameItem, Encounter, EncounterItem } from '../types'
import _ from 'lodash'
import moment from 'moment'

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
    const encounterItemRecords: Omit<EncounterItem, 'id'>[] = history.map(item => {
      // is kana or not available yet
      const skipSync =
        !!item.subject.isKana ||
        !item.assignment?.available_at ||
        moment(item.assignment?.available_at).isAfter()

      return {
        sessionId: encounterId,
        gameId, // Denormalized for easy querying
        subjectId: item.subject.id,
        assignmentId: item.assignment?.id,
        timestamp: now, // Approximate timestamps
        correctMeaning: !!item.correct,
        correctReading: !!item.correct,
        synced: skipSync,
      }
    })

    encounterItems.insertMany(encounterItemRecords)

    console.log(
      '[OfflineGameService] Saved encounter:',
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
}
