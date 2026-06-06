import _ from 'lodash'
import { preferences } from '../core/db'
import { updateContentPreference } from '../core/preferencesStore'
import { SubjectType } from '../core/types'
import type { ContentPreferenceState } from '../core/types'
import type { StartupMigration } from './types'
import { readLocalStorageValue } from '@mantine/hooks'

export const migrateContentPreferencesFromLocalStorage: StartupMigration = {
  id: '20260605_migrate_content_preferences_from_local_storage',

  async run() {
    if (typeof localStorage === 'undefined') return

    await preferences.isReady()

    const current = preferences.findOne({ id: 'current' })?.content
    const updates: Partial<ContentPreferenceState> = {}

    if (
      !current ||
      'hiddenSubjects' in current ||
      'gameLevelMin' in current ||
      'gameLevelMax' in current
    ) {
      return
    }

    if (!current.hiddenSubjects) {
      const hiddenSubjects = readLocalStorageValue<SubjectType[]>({ key: 'suki_hidden_subjects' })
      if (hiddenSubjects) updates.hiddenSubjects = hiddenSubjects
    }

    if (typeof current.gameLevelMin !== 'number') {
      const gameLevelMin = readLocalStorageValue<number>({ key: 'suki_level_min' })
      if (typeof gameLevelMin === 'number') updates.gameLevelMin = gameLevelMin
    }

    if (typeof current.gameLevelMax !== 'number') {
      const gameLevelMax = readLocalStorageValue<number>({ key: 'suki_level_max' })
      if (typeof gameLevelMax === 'number') updates.gameLevelMax = gameLevelMax
    }

    if (!_.isEmpty(updates)) {
      await updateContentPreference(updates)
    }
  },
}
