import type { NotificationSchedule } from '../types'
import {
  disableLocalNotificationPreferences,
  saveLocalNotificationPreferences,
} from '../core/preferencesStore'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

const getCurrentTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const getPublicKey = () => {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

  if (!publicKey) {
    throw new Error('Push notifications are not configured yet.')
  }

  return publicKey
}

export const isPushNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export const normalizeNotificationSchedule = (
  schedule: NotificationSchedule,
): NotificationSchedule => {
  const timezone = getCurrentTimezone()
  const daysOfWeek =
    schedule.cadence === 'daily'
      ? [0, 1, 2, 3, 4, 5, 6]
      : schedule.daysOfWeek.length > 0
        ? schedule.daysOfWeek
        : [new Date().getDay()]

  return {
    ...schedule,
    daysOfWeek,
    timezone,
  }
}

const postSubscription = async (path: string, body: Record<string, unknown>): Promise<Response> => {
  return fetch(path, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
}

export const subscribeToPushNotifications = async (
  schedule: NotificationSchedule,
  userId: string,
) => {
  if (!isPushNotificationSupported()) {
    throw new Error('This browser does not support push notifications.')
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await window.Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const publicKey = getPublicKey()
  const registration = await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const normalizedSchedule = normalizeNotificationSchedule({
    ...schedule,
    enabled: true,
  })

  const response = await postSubscription('/api/v1/notifications/subscribe', {
    subscription: subscription.toJSON(),
    schedule: normalizedSchedule,
    userId,
  })

  if (!response.ok) {
    throw new Error('Could not save notification settings.')
  }

  await saveLocalNotificationPreferences(normalizedSchedule)

  return normalizedSchedule
}

export const savePushNotificationSchedule = async (
  schedule: NotificationSchedule,
  userId: string,
) => {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return subscribeToPushNotifications(schedule, userId)
  }

  const normalizedSchedule = normalizeNotificationSchedule(schedule)

  const response = await postSubscription('/api/v1/notifications/subscribe', {
    subscription: subscription.toJSON(),
    schedule: normalizedSchedule,
    userId,
  })

  if (!response.ok) {
    throw new Error('Could not update notification settings.')
  }

  await saveLocalNotificationPreferences(normalizedSchedule)

  return normalizedSchedule
}

export const sendTestPushNotification = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('This browser does not support push notifications.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    throw new Error('Save the notification schedule before sending a test push.')
  }

  const response = await postSubscription('/api/v1/notifications/test-push', {
    endpoint: subscription.endpoint,
  })

  if (!response.ok) {
    throw new Error('Could not send test push notification.')
  }
}

export const unsubscribeFromPushNotifications = async () => {
  if (!isPushNotificationSupported()) {
    await disableLocalNotificationPreferences()
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    await disableLocalNotificationPreferences()
    return
  }

  await postSubscription('/api/v1/notifications/unsubscribe', {
    endpoint: subscription.endpoint,
  })

  await subscription.unsubscribe()
  await disableLocalNotificationPreferences()
}
