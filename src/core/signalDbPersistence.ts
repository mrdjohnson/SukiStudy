import type { Changeset, LoadResponse, PersistenceAdapter } from '@signaldb/core'
import createIndexedDBAdapter from '@signaldb/indexeddb'

const CHANNEL_PREFIX = 'sukistudy:signaldb'
const CHANGE_MESSAGE_TYPE = 'sukistudy:signaldb-changes'

type BroadcastChannelMessageEvent = {
  data: unknown
}

type BroadcastChannelLike = {
  onmessage: ((event: BroadcastChannelMessageEvent) => void) | null
  postMessage(message: unknown): void
  close(): void
}

type BroadcastChannelConstructor = {
  new (name: string): BroadcastChannelLike
}

type BroadcastRuntimeGlobal = {
  BroadcastChannel?: BroadcastChannelConstructor
  crypto?: {
    randomUUID?: () => string
  }
}

type SignalDbChangeMessage<T> = {
  type: typeof CHANGE_MESSAGE_TYPE
  sourceId: string
  changes: Changeset<T>
}

const broadcastGlobal = globalThis as unknown as BroadcastRuntimeGlobal
const sourceId =
  broadcastGlobal.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

const hasChanges = <T>(changes: Changeset<T>) => {
  return changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isSignalDbChangeMessage = <T>(message: unknown): message is SignalDbChangeMessage<T> => {
  if (!isRecord(message)) return false

  return message.type === CHANGE_MESSAGE_TYPE && typeof message.sourceId === 'string'
}

export const createSyncedIndexedDBAdapter = <
  T extends { id: I } & Record<string, any>,
  I = T['id'],
>(
  name: string,
  options?: {
    prefix?: string
  },
): PersistenceAdapter<T, I> => {
  const adapter = createIndexedDBAdapter(name, options) as PersistenceAdapter<T, I>
  const BroadcastChannel = broadcastGlobal.BroadcastChannel

  if (!BroadcastChannel) return adapter

  const channel = new BroadcastChannel(`${CHANNEL_PREFIX}:${options?.prefix ?? ''}${name}`)
  let messageListener: ((event: BroadcastChannelMessageEvent) => void) | null = null

  const loadFreshItems = async (onChange: (data?: LoadResponse<T>) => void | Promise<void>) => {
    await onChange(await adapter.load())
  }

  return {
    async load() {
      return adapter.load()
    },

    async save(items, changes) {
      await adapter.save(items, changes)

      if (!hasChanges(changes)) return

      channel.postMessage({
        type: CHANGE_MESSAGE_TYPE,
        sourceId,
        changes,
      } satisfies SignalDbChangeMessage<T>)
    },

    async register(onChange) {
      await adapter.register(onChange)

      messageListener = event => {
        if (!isSignalDbChangeMessage<T>(event.data)) return
        if (event.data.sourceId === sourceId) return

        void Promise.resolve(onChange({ changes: event.data.changes })).catch(() =>
          loadFreshItems(onChange),
        )
      }

      channel.onmessage = messageListener
    },

    async unregister() {
      if (messageListener) {
        channel.onmessage = null
        messageListener = null
      }

      channel.close()
      await adapter.unregister?.()
    },
  }
}
