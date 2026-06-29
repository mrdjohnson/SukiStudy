import { describe, expect, it } from 'vitest'
import { getContentPreferences, updateContentPreference } from '../../src/core/preferencesStore'

describe('preferencesStore', () => {
  it('does not clobber concurrent content updates', async () => {
    // Mirrors the dashboard toggle, which sets the collection ids and the
    // dashboard source at the same time.
    await Promise.all([
      updateContentPreference({ dashboardCollectionIds: ['favorites'] }),
      updateContentPreference({ dashboardSubjectSource: 'collections' }),
    ])

    const prefs = await getContentPreferences()

    expect(prefs.dashboardCollectionIds).toEqual(['favorites'])
    expect(prefs.dashboardSubjectSource).toBe('collections')
  })

  it('applies sequential updates on top of each other', async () => {
    await updateContentPreference({ studyCollectionIds: ['a'] })
    await updateContentPreference({ notificationCollectionIds: ['b'] })

    const prefs = await getContentPreferences()

    expect(prefs.studyCollectionIds).toEqual(['a'])
    expect(prefs.notificationCollectionIds).toEqual(['b'])
  })
})
