import { migrateContentPreferencesFromLocalStorage } from './20260605_migrateContentPreferencesFromLocalStorage'
import { backfillKanaCollection } from './20260630_backfillKanaCollection'
import type { StartupMigration } from './types'

const startupMigrations: StartupMigration[] = [
  migrateContentPreferencesFromLocalStorage,
  backfillKanaCollection,
]

const runMigration = async (migration: StartupMigration) => {
  try {
    await migration.run()
  } catch (error) {
    console.error(`[Migration] ${migration.id} failed`, error)
  }
}

export const runStartupMigrations = async () => {
  for (const migration of startupMigrations) {
    await runMigration(migration)
  }
}
