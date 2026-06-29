import { preferences } from '../core/db'
import {
  type ContentPreferenceState,
  type NotificationPreferenceState,
  type NotificationSchedule,
} from './types'

const CURRENT_KEY = 'current'

export const defaultContentPreferences: Required<Omit<ContentPreferenceState, 'updatedAt'>> = {
  hiddenSubjects: [],
  gameLevelMin: 1,
  gameLevelMax: 60,
  dashboardSubjectSource: 'review',
  dashboardCollectionIds: [],
  studyCollectionIds: [],
  notificationCollectionIds: [],
}

const getPreferencesDocument = async () => {
  await preferences.isReady()

  return preferences.findOne({ id: CURRENT_KEY })
}

// Serialize preference writes so concurrent updates don't clobber each other.
// Each task reads the latest persisted value right before writing, instead of
// every caller awaiting (and then overwriting) the same stale snapshot.
let pendingWrite: Promise<unknown> = Promise.resolve()

const queuePreferenceWrite = <T>(task: () => Promise<T>): Promise<T> => {
  const result = pendingWrite.then(task)
  pendingWrite = result.then(
    () => undefined,
    () => undefined,
  )

  return result
}

const updateNotificationPreference = (updates: Partial<NotificationPreferenceState>) =>
  queuePreferenceWrite(async () => {
    await preferences.isReady()
    const current = preferences.findOne({ id: CURRENT_KEY })
    const notification: NotificationPreferenceState = {
      ...current?.notification,
      ...updates,
      updatedAt: Date.now(),
    }

    preferences.updateOne(
      { id: CURRENT_KEY },
      { $set: { id: CURRENT_KEY, notification } },
      { upsert: true },
    )

    return notification
  })

export const updateContentPreference = (updates: Partial<ContentPreferenceState>) =>
  queuePreferenceWrite(async () => {
    await preferences.isReady()
    const current = preferences.findOne({ id: CURRENT_KEY })
    const content: ContentPreferenceState = {
      ...defaultContentPreferences,
      ...current?.content,
      ...updates,
      updatedAt: Date.now(),
    }

    preferences.updateOne(
      { id: CURRENT_KEY },
      { $set: { id: CURRENT_KEY, content } },
      { upsert: true },
    )

    return content
  })

export const getLocalNotificationPreferences = async () => {
  const current = await getPreferencesDocument()
  const schedule = current?.notification?.schedule

  if (!schedule) return null

  return {
    ...current,
    schedule,
    updatedAt: current.notification?.updatedAt ?? 0,
  }
}

export const getContentPreferences = async () => {
  const current = await getPreferencesDocument()

  return {
    ...defaultContentPreferences,
    ...current?.content,
  }
}

export const saveLocalNotificationPreferences = async (schedule: NotificationSchedule) => {
  const notification = await updateNotificationPreference({ schedule })

  return notification.schedule ?? schedule
}

export const disableLocalNotificationPreferences = async () => {
  const current = await getLocalNotificationPreferences()

  if (!current) return null

  return saveLocalNotificationPreferences({
    ...current.schedule,
    enabled: false,
  })
}

export const updateContentPreferenceKey =
  (key: keyof Parameters<typeof updateContentPreference>[0]) =>
  (updates: Parameters<typeof updateContentPreference>[0][typeof key]) => {
    updateContentPreference({ [key]: updates })
  }
