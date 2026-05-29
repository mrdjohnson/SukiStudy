import { defineTask } from 'nitro/task'
import {
  buildNotificationPayload,
  getNextScheduledDateKey,
  getRedis,
  getVapidConfig,
  isRecord,
  parseStoredRecord,
  SUBSCRIPTIONS_KEY,
  type SendDailyNotificationResult,
  type StoredPushSubscription,
} from '../../utils/pubSubUtils'
import webPush from 'web-push'

export const sendDuePushNotifications = async () => {
  const redis = getRedis()
  const records = (await redis.hvals(SUBSCRIPTIONS_KEY)) as unknown[]
  const vapid = getVapidConfig()
  const result: SendDailyNotificationResult = {
    checked: records.length,
    sent: 0,
    skipped: 0,
    removed: 0,
    failed: 0,
  }

  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  await Promise.all(
    records.map(async value => {
      const record = parseStoredRecord(value)
      const scheduledDateKey = getNextScheduledDateKey(record)

      if (!scheduledDateKey || record.lastScheduledDate === scheduledDateKey) {
        result.skipped += 1
        return
      }

      try {
        await webPush.sendNotification(
          record.subscription,
          JSON.stringify(buildNotificationPayload()),
          {
            TTL: 60 * 60 * 24,
            urgency: 'normal',
          },
        )

        const updatedRecord: StoredPushSubscription = {
          ...record,
          lastScheduledDate: scheduledDateKey,
          updatedAt: new Date().toISOString(),
        }

        await redis.hset(SUBSCRIPTIONS_KEY, {
          [record.endpoint]: JSON.stringify(updatedRecord),
        })
        result.sent += 1
      } catch (error) {
        const statusCode =
          isRecord(error) && typeof error.statusCode === 'number' ? error.statusCode : null

        if (statusCode === 404 || statusCode === 410) {
          await redis.hdel(SUBSCRIPTIONS_KEY, record.endpoint)
          result.removed += 1
          return
        }

        console.error('Failed to send push notification', error)
        result.failed += 1
      }
    }),
  )

  return result
}

export default defineTask({
  meta: {
    name: 'notifications:send-due',
    description: 'Send due SukiStudy push notifications',
  },
  async run() {
    const result = await sendDuePushNotifications()

    return { result }
  },
})
