import { buildSubjectNotification } from '../utils/buildSubjectNotification'
import { getLocalNotificationPreferences } from '../../core/preferencesStore'
import { showScheduledNotification } from './scheduleUtils'
import type { NotificationPayload, StudyNotificationOptions } from '../swTypes'

type ServiceWorkerDebugDetails = Record<string, unknown>

const safeParsePushPayload = (event: PushEvent): NotificationPayload => {
  try {
    return event.data?.json() || {}
  } catch {
    return {}
  }
}

const debugNotificationClick = async (message: string, details: ServiceWorkerDebugDetails = {}) => {
  const payload = {
    type: 'sukistudy:sw-debug',
    message,
    details,
  }

  console.log(`[SukiStudy SW] ${message}`, details)

  const windowClients = (await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })) as WindowClient[]

  for (const client of windowClients) {
    client.postMessage(payload)
  }
}

const getNotificationUrl = ({ action, notification }: NotificationEvent) => {
  if (action === 'disable_notifications') return '/settings/notifications?disable=true'
  if (action === 'learn') return '/session/lesson'

  const itemId = notification.data?.itemId
  const url = notification.data?.url

  if (itemId && (action === 'more_info' || !action)) {
    return `/subjects/${itemId}`
  }

  return url || '/'
}

const openOrFocusUrl = async (url: string) => {
  const targetUrl = new URL(url, self.location.origin).href
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  await debugNotificationClick('notificationclick clients found', {
    targetUrl,
    clients: windowClients.map(client => client.url),
  })

  for (const client of windowClients) {
    let clientUrl: URL

    try {
      clientUrl = new URL(client.url)
    } catch (error) {
      await debugNotificationClick('notificationclick skipped invalid client URL', {
        clientUrl: client.url,
        error: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    if (clientUrl.origin === self.location.origin) {
      try {
        const navigatedClient = await client.navigate(targetUrl)

        await debugNotificationClick('notificationclick navigated existing client', {
          from: client.url,
          targetUrl,
          navigatedUrl: navigatedClient?.url,
        })

        return (navigatedClient || client).focus()
      } catch (error) {
        await debugNotificationClick('notificationclick client.navigate failed', {
          from: client.url,
          targetUrl,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }
    }
  }

  await debugNotificationClick('notificationclick opening new window', { targetUrl })

  const openedClient = await self.clients.openWindow(targetUrl)

  await debugNotificationClick('notificationclick openWindow result', {
    targetUrl,
    openedUrl: openedClient?.url,
    opened: !!openedClient,
  })

  return openedClient
}

const getTestFallbackNotification = (reason: string) => ({
  kind: 'fallback' as const,
  title: 'Test push received',
  body: `The service worker handled this push. Decision: ${reason}.`,
  url: '/',
  actions: [{ action: 'open', title: 'Open app' }],
})

const handlePush = async (event: PushEvent) => {
  try {
    const payload = safeParsePushPayload(event)
    const decision = await buildSubjectNotification({
      triggerType: payload.type ?? 'review_due',
      now: Date.now(),
    })

    const notification =
      decision.kind === 'skip' && payload.test
        ? getTestFallbackNotification(decision.reason)
        : decision

    if (notification.kind === 'skip') return

    const preferences = await getLocalNotificationPreferences()
    const options: StudyNotificationOptions = {
      body: notification.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: notification.kind === 'show' ? 'review-due' : 'generic-return',
      renotify: false,
      data: {
        url: notification.url,
        itemId: notification.kind === 'show' ? notification.itemId : '',
        kind: notification.kind,
      },
      actions: notification.actions,
    }

    await showScheduledNotification(
      notification.title,
      options,
      payload.test ? undefined : preferences?.schedule,
    )

    console.log('created a push')
  } catch (error) {
    console.warn('Push notification skipped after an unexpected error', error)
  }
}

const handleNotificationClick = async (event: NotificationEvent) => {
  const url = getNotificationUrl(event)

  await debugNotificationClick('notificationclick received', {
    action: event.action,
    url,
    notificationData: event.notification.data,
  })

  event.notification.close()
  await openOrFocusUrl(url)
}

export const registerPushNotificationHandlers = () => {
  self.addEventListener('push', (event: PushEvent) => {
    event.waitUntil(handlePush(event))
  })

  self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.waitUntil(handleNotificationClick(event))
  })
}
