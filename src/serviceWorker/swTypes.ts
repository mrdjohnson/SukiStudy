import { SubjectType } from '../core/types'

export type NotificationStudyItem = {
  id: number
  type: SubjectType
  label: string
  definition: string
}

type NotificationActionOption = {
  action: string
  title: string
  icon?: string
}

type PlainNotificationOptions = {
  badge?: string
  body?: string
  data?: unknown
  dir?: 'auto' | 'ltr' | 'rtl'
  icon?: string
  lang?: string
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  timestamp?: number
  vibrate?: number | number[]
}

export type NotificationPayload = {
  type?: string
  test?: boolean
}

export type StudyNotificationOptions = PlainNotificationOptions & {
  image?: string
  renotify?: boolean
  actions?: NotificationActionOption[]
  showTrigger?: unknown
}

export type TimestampTriggerConstructor = {
  new (timestamp: number): unknown
}
