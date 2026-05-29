import { defineHandler, HTTPError, readBody } from 'h3'
import {
  getRedis,
  isRecord,
  parseStoredRecord,
  sanitizeSchedule,
  SUBSCRIPTIONS_KEY,
  type StoredPushSubscription,
  type SubscribeBody,
} from '../../../utils/pubSubUtils'
import { type PushSubscription } from 'web-push'

export const isPushSubscription = (value: unknown): value is PushSubscription => {
  if (!isRecord(value)) return false
  if (typeof value.endpoint !== 'string') return false
  if (!isRecord(value.keys)) return false

  return typeof value.keys.p256dh === 'string' && typeof value.keys.auth === 'string'
}

export const savePushSubscription = async (body: SubscribeBody) => {
  if (!isPushSubscription(body.subscription)) {
    throw new Error('Invalid push subscription.')
  }

  const redis = getRedis()
  const now = new Date().toISOString()
  const existing = await redis.hget<string>(SUBSCRIPTIONS_KEY, body.subscription.endpoint)
  const existingRecord = existing ? parseStoredRecord(existing) : null
  const record: StoredPushSubscription = {
    endpoint: body.subscription.endpoint,
    subscription: body.subscription,
    schedule: sanitizeSchedule(body.schedule),
    userId: body.userId,
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
    lastScheduledDate: existingRecord?.lastScheduledDate || existingRecord?.lastSentDate,
  }

  await redis.hset(SUBSCRIPTIONS_KEY, {
    [record.endpoint]: JSON.stringify(record),
  })

  return record
}

export default defineHandler(async event => {
  try {
    const body = await readBody<SubscribeBody>(event)
    const record = await savePushSubscription(body || {})

    return {
      ok: true,
      schedule: record.schedule,
    }
  } catch (error) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Could not save subscription.',
    })
  }
})
