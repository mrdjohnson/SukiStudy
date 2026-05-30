import { preferences } from '../core/db'
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

  preferences.updateOne(
    { id: CURRENT_KEY },
    { $set: { id: CURRENT_KEY, notification } },
    { upsert: true },
  )

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
