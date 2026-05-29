import type { NotificationSchedule } from '../../types'
import type { StudyNotificationOptions, TimestampTriggerConstructor } from '../../types'

const getNextLocalNotificationTime = (schedule?: NotificationSchedule) => {
  if (!schedule?.enabled || !/^\d{2}:\d{2}$/.test(schedule.time)) return Date.now()

  const [hours, minutes] = schedule.time.split(':').map(Number)
  const allowedDays = schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek : [new Date().getDay()]
  const now = new Date()

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + dayOffset)
    candidate.setHours(hours, minutes, 0, 0)

    if (!allowedDays.includes(candidate.getDay())) continue
    if (candidate.getTime() <= now.getTime()) continue

    return candidate.getTime()
  }

  return Date.now()
}

export const showScheduledNotification = async (
  title: string,
  options: StudyNotificationOptions,
  schedule?: NotificationSchedule,
) => {
  const scheduledAt = getNextLocalNotificationTime(schedule)
  const TimestampTrigger = (self as unknown as { TimestampTrigger?: TimestampTriggerConstructor })
    .TimestampTrigger

  // Notification Triggers let the once-daily server push become a local alarm.
  // Browsers without support fall back to showing the notification immediately.
  if (TimestampTrigger && scheduledAt > Date.now()) {
    const scheduledOptions: StudyNotificationOptions = {
      ...options,
      showTrigger: new TimestampTrigger(scheduledAt),
    }

    await self.registration.showNotification(title, scheduledOptions)
    return
  }

  await self.registration.showNotification(title, options)
}
