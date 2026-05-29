import { preferences } from '../services/db'
import type { NotificationPreferenceState, NotificationSchedule } from '../types'

const CURRENT_KEY = 'current'

const getPreferencesDocument = async () => {
  await preferences.isReady()

  return preferences.findOne({ id: CURRENT_KEY })
}

const updateNotificationPreference = async (updates: Partial<NotificationPreferenceState>) => {
  const current = await getPreferencesDocument()
  const notification: NotificationPreferenceState = {
    ...current?.notification,
    ...updates,
    updatedAt: Date.now(),
  }

  if (current) {
    preferences.updateOne({ id: CURRENT_KEY }, { $set: { notification } })
  } else {
    preferences.insert({ id: CURRENT_KEY, notification })
  }

  return notification
}

export const getLocalNotificationPreferences = async () => {
  const current = await getPreferencesDocument()
  const schedule = current?.notification?.schedule

  if (!schedule) return null

  return {
    schedule,
    updatedAt: current.notification?.updatedAt ?? 0,
  }
}

export const saveLocalNotificationPreferences = async (schedule: NotificationSchedule) => {
  await updateNotificationPreference({ schedule })
}

export const disableLocalNotificationPreferences = async () => {
  const current = await getLocalNotificationPreferences()

  if (!current) return

  await saveLocalNotificationPreferences({
    ...current.schedule,
    enabled: false,
  })
}
