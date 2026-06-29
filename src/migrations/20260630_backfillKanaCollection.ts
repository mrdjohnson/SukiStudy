import { subjectCollections } from '../core/db'
import { KANA_COLLECTION_ID, syncKanaCollection } from '../core/collectionStore'
import type { StartupMigration } from './types'

/**
 * Backfill the Kana Basics system collection for users who already had kana
 * populated before it existed (and won't re-run populateKana). Going forward the
 * sync service keeps it up to date whenever kana is (re)populated, so this only
 * needs to create it once — it no-ops as soon as the collection exists.
 */
export const backfillKanaCollection: StartupMigration = {
  id: '20260630_backfill_kana_collection',

  async run() {
    await subjectCollections.isReady()

    if (subjectCollections.findOne({ id: KANA_COLLECTION_ID })) return

    await syncKanaCollection()
  },
}
