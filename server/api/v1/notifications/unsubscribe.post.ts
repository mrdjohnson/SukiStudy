import { defineHandler, HTTPError, readBody } from 'h3'
import { getRedis, SUBSCRIPTIONS_KEY } from '../../../utils/pubSubUtils'

export const deletePushSubscription = async (endpoint: unknown) => {
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new Error('Invalid subscription endpoint.')
  }

  const deleted = await getRedis().hdel(SUBSCRIPTIONS_KEY, endpoint)

  return { deleted }
}

export default defineHandler(async event => {
  try {
    const body = await readBody<{ endpoint?: unknown }>(event)
    const result = await deletePushSubscription(body?.endpoint)

    return {
      ok: true,
      ...result,
    }
  } catch (error) {
    throw new HTTPError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Could not delete subscription.',
    })
  }
})
