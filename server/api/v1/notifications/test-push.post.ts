import { defineHandler, HTTPError, readBody } from 'h3'
import {
  buildNotificationPayload,
  getStoredPushSubscription,
  getVapidConfig,
  type SendTestNotificationResult,
} from '../../../utils/pubSubUtils'

import webPush from 'web-push'

type TestSendBody = {
  endpoint?: unknown
}

export const sendTestPushNotification = async (
  endpoint: unknown,
): Promise<SendTestNotificationResult> => {
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error('Invalid subscription endpoint.')
  }

  const record = await getStoredPushSubscription(endpoint)

  if (!record) {
    throw new Error('No saved push subscription found for this browser.')
  }

  const vapid = getVapidConfig()
  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  await webPush.sendNotification(
    record.subscription,
    JSON.stringify(buildNotificationPayload({ test: true })),
    {
      TTL: 60 * 60,
      urgency: 'high',
    },
  )

  return {
    sent: true,
    endpoint: record.endpoint,
  }
}

export default defineHandler(async event => {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV || !import.meta.env.DEV) {
    throw new HTTPError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  try {
    const body = await readBody<TestSendBody>(event)

    return sendTestPushNotification(body?.endpoint)
  } catch (error) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage:
        error instanceof Error ? error.message : 'Could not send test push notification.',
    })
  }
})
