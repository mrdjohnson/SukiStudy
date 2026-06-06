import { migrateContentPreferencesFromLocalStorage } from './20260605_migrateContentPreferencesFromLocalStorage'
import type { StartupMigration } from './types'

const startupMigrations: StartupMigration[] = [migrateContentPreferencesFromLocalStorage]

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
