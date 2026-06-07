import type { ReactNode } from 'react'
import { assignments, preferences, studyMaterials, subjects, users } from '../src/core/db'
import { defaultContentPreferences } from '../src/core/preferencesStore'
import type { ContentPreferenceState, GameItem } from '../src/core/types'
import { SettingsProvider } from '../src/contexts/SettingsContext'
import { UserProvider } from '../src/contexts/UserContext'

export const TEST_NOW = new Date('2026-06-01T12:00:00Z')

export const HookTestProviders = ({ children }: { children: ReactNode }) => (
  <UserProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </UserProvider>
)

export const resetTestDatabase = async () => {
  await Promise.all([
    subjects.isReady(),
    assignments.isReady(),
    studyMaterials.isReady(),
    users.isReady(),
    preferences.isReady(),
  ])

  subjects.removeMany({})
  assignments.removeMany({})
  studyMaterials.removeMany({})
  users.removeMany({})
  preferences.removeMany({})
}

export const seedContentPreferences = async (updates: Partial<ContentPreferenceState>) => {
  await preferences.isReady()

  preferences.updateOne(
    { id: 'current' },
    {
      $set: {
        id: 'current',
        content: {
          ...defaultContentPreferences,
          ...updates,
        },
      },
    },
    { upsert: true },
  )
}

type HookResultWithItems = {
  current: {
    items: GameItem[]
  }
}

export const subjectIdsOf = (result: HookResultWithItems) =>
  result.current.items.map(item => item.subject.id)

export const hoursFromTestNow = (hours: number) =>
  new Date(TEST_NOW.getTime() + hours * 60 * 60 * 1000).toISOString()
