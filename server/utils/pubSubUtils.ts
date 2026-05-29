import { Redis } from '@upstash/redis'
import type { PushSubscription } from 'web-push'

export const SUBSCRIPTIONS_KEY = 'sukistudy:push:subscriptions'
const DEFAULT_NOTIFICATION_TIME = '09:00'
const DEFAULT_TIMEZONE = 'UTC'

type NotificationCadence = 'daily' | 'custom' | 'weekly'

type NotificationSchedule = {
  enabled: boolean
  cadence: NotificationCadence
  daysOfWeek: number[]
  time: string
  timezone: string
}

type SubscribeBody = {
  subscription?: unknown
  schedule?: Partial<NotificationSchedule>
  userId?: string
}

export type { SubscribeBody }

export type StoredPushSubscription = {
  endpoint: string
  subscription: PushSubscription
  schedule: NotificationSchedule
  userId?: string
  createdAt: string
  updatedAt: string
  lastScheduledDate?: string
  lastSentDate?: string
}

export type SendDailyNotificationResult = {
  checked: number
  sent: number
  skipped: number
  removed: number
  failed: number
}

export type SendTestNotificationResult = {
  sent: boolean
  endpoint: string
}

const getEnv = (name: string) => process.env[name]

export const getRedis = () => {
  const url = getEnv('KV_REST_API_URL')
  const token = getEnv('KV_REST_API_TOKEN')

  if (!url || !token) {
    console.log({ url, token })
    throw new Error('Missing Upstash Redis REST configuration.')
  }

  return new Redis({ url, token })
}

export const getVapidConfig = () => {
  const publicKey = getEnv('VAPID_PUBLIC_KEY')
  const privateKey = getEnv('VAPID_PRIVATE_KEY')

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID public/private keys.')
  }

  return {
    publicKey,
    privateKey,
    subject: 'https://sukistudy.vercel.app',
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const sanitizeDaysOfWeek = (value: unknown) => {
  if (!Array.isArray(value)) return [0, 1, 2, 3, 4, 5, 6]

  const days = value
    .map(day => Number(day))
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)

  return days.length > 0 ? Array.from(new Set(days)).sort() : [0, 1, 2, 3, 4, 5, 6]
}

const sanitizeTime = (value: unknown) => {
  if (typeof value !== 'string') return DEFAULT_NOTIFICATION_TIME

  return /^\d{2}:\d{2}$/.test(value) ? value : DEFAULT_NOTIFICATION_TIME
}

const sanitizeTimezone = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0) return DEFAULT_TIMEZONE

  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return value
  } catch {
    return DEFAULT_TIMEZONE
  }
}

export const sanitizeSchedule = (value: SubscribeBody['schedule']): NotificationSchedule => {
  const cadence =
    value?.cadence === 'custom' || value?.cadence === 'weekly' ? value.cadence : 'daily'

  return {
    enabled: value?.enabled !== false,
    cadence,
    daysOfWeek: sanitizeDaysOfWeek(value?.daysOfWeek),
    time: sanitizeTime(value?.time),
    timezone: sanitizeTimezone(value?.timezone),
  }
}

const getTodayParts = (timezone: string, date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const partMap = Object.fromEntries(parts.map(part => [part.type, part.value]))
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return {
    dateKey: `${partMap.year}-${partMap.month}-${partMap.day}`,
    dayOfWeek: weekdayMap[partMap.weekday] ?? 0,
    time: `${partMap.hour}:${partMap.minute}`,
  }
}

export const getNextScheduledDateKey = (record: StoredPushSubscription, date = new Date()) => {
  if (!record.schedule.enabled) return null

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = getTodayParts(
      record.schedule.timezone,
      new Date(date.getTime() + dayOffset * 24 * 60 * 60 * 1000),
    )

    if (!record.schedule.daysOfWeek.includes(candidate.dayOfWeek)) continue
    if (dayOffset === 0 && candidate.time >= record.schedule.time) continue

    return candidate.dateKey
  }

  return null
}

export const buildNotificationPayload = (options?: { test?: boolean }) => {
  return {
    type: 'review_due',
    test: options?.test,
  }
}

export const parseStoredRecord = (value: unknown) => {
  if (typeof value === 'string') {
    return JSON.parse(value) as StoredPushSubscription
  }

  return value as StoredPushSubscription
}

export const getStoredPushSubscription = async (endpoint: string) => {
  const existing = await getRedis().hget<string>(SUBSCRIPTIONS_KEY, endpoint)

  return existing ? parseStoredRecord(existing) : null
}
