import _ from 'lodash'
import { createId } from '@paralleldrive/cuid2'
import { subjectCollections, subjects } from './db'
import type { SubjectCollection } from './types'
import { hashString } from './hash'

const normalizeSubjectIds = (subjectIds: number[]) => _.uniq(subjectIds).sort((a, b) => a - b)

export const getCollectionLabel = (collection?: SubjectCollection) => {
  if (!collection) return 'Collection'

  return collection.source === 'system' ? `${collection.name} (system)` : collection.name
}

export const createSubjectCollection = async ({
  name,
  description,
  subjectIds = [],
  source = 'user',
  id,
}: {
  name: string
  description?: string
  subjectIds?: number[]
  source?: SubjectCollection['source']
  id?: string
}) => {
  await subjectCollections.isReady()

  const now = Date.now()
  const collection: SubjectCollection = {
    id: id || createId(),
    name: name.trim(),
    description: description?.trim() || undefined,
    source,
    subjectIds: normalizeSubjectIds(subjectIds),
    seed: hashString(`${source}:${id || name}`),
    createdAt: now,
    updatedAt: now,
  }

  subjectCollections.updateOne({ id: collection.id }, { $set: collection }, { upsert: true })

  return collection
}

export const addSubjectsToCollection = async (collectionId: string, subjectIds: number[]) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection || collection.source === 'system') return null

  const nextSubjectIds = normalizeSubjectIds([...collection.subjectIds, ...subjectIds])
  const updatedAt = Date.now()

  subjectCollections.updateOne(
    { id: collectionId },
    { $set: { subjectIds: nextSubjectIds, updatedAt } },
  )

  return {
    ...collection,
    subjectIds: nextSubjectIds,
    updatedAt,
  }
}

export const renameSubjectCollection = async (collectionId: string, name: string) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection || collection.source === 'system') return null

  const nextName = name.trim()
  if (!nextName || nextName === collection.name) return collection

  const updatedAt = Date.now()

  subjectCollections.updateOne({ id: collectionId }, { $set: { name: nextName, updatedAt } })

  return {
    ...collection,
    name: nextName,
    updatedAt,
  }
}

export const removeSubjectFromCollection = async (collectionId: string, subjectId: number) => {
  return removeSubjectsFromCollection(collectionId, [subjectId])
}

export const removeSubjectsFromCollection = async (collectionId: string, subjectIds: number[]) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection || collection.source === 'system') return null

  const removeSet = new Set(subjectIds)
  const nextSubjectIds = collection.subjectIds.filter(id => !removeSet.has(id))
  const updatedAt = Date.now()

  subjectCollections.updateOne(
    { id: collectionId },
    { $set: { subjectIds: nextSubjectIds, updatedAt } },
  )

  return {
    ...collection,
    subjectIds: nextSubjectIds,
    updatedAt,
  }
}

// Soft delete: move to the recycle bin. Works for system collections too (they
// can be restored later, and syncKanaCollection leaves isDeleted intact).
export const deleteSubjectCollection = async (collectionId: string) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection) return false

  const now = Date.now()
  subjectCollections.updateOne({ id: collectionId }, { $set: { isDeleted: true, updatedAt: now } })

  return true
}

export const restoreSubjectCollection = async (collectionId: string) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection) return false

  subjectCollections.updateOne(
    { id: collectionId },
    { $set: { isDeleted: undefined, updatedAt: Date.now() } },
  )

  return true
}

export const permanentlyDeleteSubjectCollection = async (collectionId: string) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection) return false

  subjectCollections.removeOne({ id: collectionId })

  return true
}

export const duplicateSubjectCollection = async (collectionId: string) => {
  await subjectCollections.isReady()

  const collection = subjectCollections.findOne({ id: collectionId })
  if (!collection) return null

  // Always produce an editable user copy with its own id/seed (so the duplicate
  // gets a distinct word cloud), even when duplicating a system collection.
  return createSubjectCollection({
    name: `${collection.name} copy`,
    description: collection.description,
    subjectIds: collection.subjectIds,
    source: 'user',
  })
}

// The hidden collection holds items the user has hidden from study and the
// dashboard. Its membership is user-managed (via hide/unhide), so we only create
// it when missing and never overwrite its subjectIds.
export const HIDDEN_COLLECTION_ID = 'system-hidden'

const ensureHiddenCollection = () => {
  if (subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })) return

  const now = Date.now()
  subjectCollections.insert({
    id: HIDDEN_COLLECTION_ID,
    name: 'Hidden',
    description: 'Items hidden from study and the dashboard.',
    source: 'system',
    subjectIds: [],
    seed: hashString('system:hidden'),
    createdAt: now,
    updatedAt: now,
  })
}

export const setSubjectHidden = async (subjectId: number, hidden: boolean) => {
  await subjectCollections.isReady()
  ensureHiddenCollection()

  const collection = subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })!

  const nextSubjectIds = hidden
    ? normalizeSubjectIds([...collection.subjectIds, subjectId])
    : collection.subjectIds.filter(id => id !== subjectId)

  subjectCollections.updateOne(
    { id: HIDDEN_COLLECTION_ID },
    { $set: { subjectIds: nextSubjectIds, updatedAt: Date.now(), isDeleted: undefined } },
  )
}

export const getHiddenSubjectIds = () => {
  const collection = subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })
  // A soft-deleted hidden collection means nothing is hidden.
  if (!collection || collection.isDeleted) return []

  return collection.subjectIds
}

export const KANA_COLLECTION_ID = 'system-kana'

// Mirror the kana subjects into the Kana Basics system collection. Kana only
// changes when it is (re)populated, so this is called from the sync service
// after populateKana (and once via a backfill migration) rather than on every
// subject change.
export const syncKanaCollection = async () => {
  await subjectCollections.isReady()
  await subjects.isReady()

  const kanaSubjectIds = subjects
    .find({ isKana: true })
    .fetch()
    .map(subject => subject.id)
  if (kanaSubjectIds.length === 0) return

  const existing = subjectCollections.findOne({ id: KANA_COLLECTION_ID })
  const now = Date.now()

  subjectCollections.updateOne(
    { id: KANA_COLLECTION_ID },
    {
      $set: {
        id: KANA_COLLECTION_ID,
        name: 'Kana Basics',
        description: 'System collection for hiragana and katakana practice.',
        source: 'system',
        subjectIds: normalizeSubjectIds(kanaSubjectIds),
        seed: hashString('system:kana'),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    },
    { upsert: true },
  )
}
