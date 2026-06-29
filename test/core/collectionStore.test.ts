import { describe, expect, it } from 'vitest'
import {
  HIDDEN_COLLECTION_ID,
  KANA_COLLECTION_ID,
  addSubjectsToCollection,
  createSubjectCollection,
  deleteSubjectCollection,
  duplicateSubjectCollection,
  getCollectionLabel,
  getHiddenSubjectIds,
  permanentlyDeleteSubjectCollection,
  removeSubjectFromCollection,
  removeSubjectsFromCollection,
  renameSubjectCollection,
  restoreSubjectCollection,
  setSubjectHidden,
  syncKanaCollection,
} from '../../src/core/collectionStore'
import { subjectCollections, subjects } from '../../src/core/db'
import { SubjectType } from '../../src/core/types'
import type { Subject } from '../../src/core/types'

const subjectFixture = (overrides: Partial<Subject> = {}): Subject => ({
  id: 1,
  created_at: new Date().toISOString(),
  level: 1,
  slug: 'subject',
  hidden_at: null,
  document_url: '',
  characters: 'あ',
  character_images: [],
  meanings: [{ meaning: 'a', primary: true, accepted_answer: true }],
  auxiliary_meanings: [],
  component_subject_ids: [],
  amalgamation_subject_ids: [],
  visually_similar_subject_ids: [],
  meaning_mnemonic: '',
  lesson_position: 0,
  spaced_repetition_system_id: 1,
  ...overrides,
})

describe('collection store', () => {
  describe('createSubjectCollection', () => {
    it('creates a user collection with normalized, de-duplicated subject ids', async () => {
      const collection = await createSubjectCollection({
        name: '  Tricky Kanji  ',
        description: '  hard ones  ',
        subjectIds: [3, 1, 3, 2],
      })

      expect(collection.name).toBe('Tricky Kanji')
      expect(collection.description).toBe('hard ones')
      expect(collection.source).toBe('user')
      expect(collection.subjectIds).toEqual([1, 2, 3])
      expect(subjectCollections.findOne({ id: collection.id })?.subjectIds).toEqual([1, 2, 3])
    })

    it('drops an empty description', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites', description: '   ' })

      expect(collection.description).toBeUndefined()
    })
  })

  describe('addSubjectsToCollection', () => {
    it('adds and de-duplicates subjects on a user collection', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites', subjectIds: [1] })

      const result = await addSubjectsToCollection(collection.id, [2, 1, 3])

      expect(result?.subjectIds).toEqual([1, 2, 3])
      expect(subjectCollections.findOne({ id: collection.id })?.subjectIds).toEqual([1, 2, 3])
    })

    it('does not add subjects to system collections', async () => {
      subjectCollections.insert({
        id: 'system-kana',
        name: 'Kana Basics',
        subjectIds: [1],
        source: 'system',
        seed: 123,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const result = await addSubjectsToCollection('system-kana', [2])

      expect(result).toBeNull()
      expect(subjectCollections.findOne({ id: 'system-kana' })?.subjectIds).toEqual([1])
    })
  })

  describe('renameSubjectCollection', () => {
    it('renames a user collection (trimmed)', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites' })

      const result = await renameSubjectCollection(collection.id, '  Exam Prep  ')

      expect(result?.name).toBe('Exam Prep')
      expect(subjectCollections.findOne({ id: collection.id })?.name).toBe('Exam Prep')
    })

    it('ignores blank names', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites' })

      const result = await renameSubjectCollection(collection.id, '   ')

      expect(result?.name).toBe('Favorites')
      expect(subjectCollections.findOne({ id: collection.id })?.name).toBe('Favorites')
    })

    it('does not rename system collections', async () => {
      subjectCollections.insert({
        id: 'system-kana',
        name: 'Kana Basics',
        subjectIds: [],
        source: 'system',
        seed: 123,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const result = await renameSubjectCollection('system-kana', 'Renamed')

      expect(result).toBeNull()
      expect(subjectCollections.findOne({ id: 'system-kana' })?.name).toBe('Kana Basics')
    })
  })

  describe('removeSubjectFromCollection', () => {
    it('removes a subject from a user collection', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites', subjectIds: [1, 2, 3] })

      const result = await removeSubjectFromCollection(collection.id, 2)

      expect(result?.subjectIds).toEqual([1, 3])
      expect(subjectCollections.findOne({ id: collection.id })?.subjectIds).toEqual([1, 3])
    })

    it('removes multiple subjects at once', async () => {
      const collection = await createSubjectCollection({
        name: 'Favorites',
        subjectIds: [1, 2, 3, 4],
      })

      const result = await removeSubjectsFromCollection(collection.id, [2, 4, 99])

      expect(result?.subjectIds).toEqual([1, 3])
      expect(subjectCollections.findOne({ id: collection.id })?.subjectIds).toEqual([1, 3])
    })

    it('does not remove subjects from system collections', async () => {
      subjectCollections.insert({
        id: 'system-kana',
        name: 'Kana Basics',
        subjectIds: [1, 2],
        source: 'system',
        seed: 123,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const result = await removeSubjectFromCollection('system-kana', 1)

      expect(result).toBeNull()
      expect(subjectCollections.findOne({ id: 'system-kana' })?.subjectIds).toEqual([1, 2])
    })
  })

  describe('deleteSubjectCollection (soft delete)', () => {
    it('soft-deletes a user collection (kept in the recycle bin)', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites' })

      const deleted = await deleteSubjectCollection(collection.id)

      expect(deleted).toBe(true)
      const stored = subjectCollections.findOne({ id: collection.id })
      expect(stored).toBeDefined()
      expect(stored?.isDeleted).toBe(true)
    })

    it('soft-deletes system collections too', async () => {
      subjectCollections.insert({
        id: 'system-kana',
        name: 'Kana Basics',
        subjectIds: [1],
        source: 'system',
        seed: 123,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const deleted = await deleteSubjectCollection('system-kana')

      expect(deleted).toBe(true)
      expect(subjectCollections.findOne({ id: 'system-kana' })?.isDeleted).toBe(true)
    })
  })

  describe('restoreSubjectCollection', () => {
    it('clears the isDeleted field', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites' })
      await deleteSubjectCollection(collection.id)

      const restored = await restoreSubjectCollection(collection.id)

      expect(restored).toBe(true)
      expect(subjectCollections.findOne({ id: collection.id })?.isDeleted).not.toBeDefined()
    })
  })

  describe('permanentlyDeleteSubjectCollection', () => {
    it('removes the collection for good', async () => {
      const collection = await createSubjectCollection({ name: 'Favorites' })

      const deleted = await permanentlyDeleteSubjectCollection(collection.id)

      expect(deleted).toBe(true)
      expect(subjectCollections.findOne({ id: collection.id })).toBeUndefined()
    })
  })

  describe('duplicateSubjectCollection', () => {
    it('creates an editable user copy with a distinct id and seed', async () => {
      const original = await createSubjectCollection({
        name: 'Favorites',
        description: 'best ones',
        subjectIds: [1, 2, 3],
      })

      const copy = await duplicateSubjectCollection(original.id)

      expect(copy?.id).not.toBe(original.id)
      expect(copy?.seed).not.toBe(original.seed)
      expect(copy?.name).toBe('Favorites copy')
      expect(copy?.description).toBe('best ones')
      expect(copy?.subjectIds).toEqual([1, 2, 3])
      expect(copy?.source).toBe('user')
    })

    it('duplicates a system collection into a user copy', async () => {
      subjectCollections.insert({
        id: 'system-kana',
        name: 'Kana Basics',
        subjectIds: [1, 2],
        source: 'system',
        seed: 123,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const copy = await duplicateSubjectCollection('system-kana')

      expect(copy?.source).toBe('user')
      expect(copy?.subjectIds).toEqual([1, 2])
    })
  })

  describe('syncKanaCollection', () => {
    it('mirrors kana subjects into the kana system collection', async () => {
      subjects.insert(subjectFixture({ id: 1, isKana: true, object: SubjectType.HIRAGANA }))
      subjects.insert(subjectFixture({ id: 2, isKana: true, object: SubjectType.KATAKANA }))
      subjects.insert(subjectFixture({ id: 3, isKana: false, object: SubjectType.KANJI }))

      await syncKanaCollection()

      const collection = subjectCollections.findOne({ id: KANA_COLLECTION_ID })
      expect(collection?.source).toBe('system')
      expect(collection?.subjectIds).toEqual([1, 2])

      const createdAt = collection?.createdAt

      subjects.insert(subjectFixture({ id: 4, isKana: true, object: SubjectType.HIRAGANA }))

      await syncKanaCollection()

      const updated = subjectCollections.findOne({ id: KANA_COLLECTION_ID })
      expect(updated?.subjectIds).toEqual([1, 2, 4])
      expect(updated?.createdAt).toBe(createdAt)
    })

    it('does nothing when there are no kana subjects', async () => {
      subjects.insert(subjectFixture({ id: 3, isKana: false }))

      await syncKanaCollection()

      expect(subjectCollections.findOne({ id: KANA_COLLECTION_ID })).toBeUndefined()
    })
  })

  describe('hidden collection', () => {
    it('is created lazily on first hide', async () => {
      expect(subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })).toBeUndefined()

      await setSubjectHidden(7, true)

      const hidden = subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })
      expect(hidden?.source).toBe('system')
      expect(hidden?.subjectIds).toEqual([7])
    })

    it('hides and unhides subjects', async () => {
      await setSubjectHidden(5, true)
      await setSubjectHidden(3, true)

      expect(getHiddenSubjectIds().sort((a, b) => a - b)).toEqual([3, 5])

      await setSubjectHidden(5, false)

      expect(getHiddenSubjectIds()).toEqual([3])
    })

    it('reports no hidden ids when the hidden collection is soft-deleted', async () => {
      await setSubjectHidden(5, true)
      await deleteSubjectCollection(HIDDEN_COLLECTION_ID)

      expect(getHiddenSubjectIds()).toEqual([])
    })
  })

  describe('getCollectionLabel', () => {
    it('marks system collections', () => {
      expect(
        getCollectionLabel({
          id: 'system-kana',
          name: 'Kana Basics',
          subjectIds: [],
          source: 'system',
          seed: 1,
          createdAt: 0,
          updatedAt: 0,
        }),
      ).toBe('Kana Basics (system)')
    })

    it('returns the plain name for user collections and a fallback when missing', () => {
      expect(
        getCollectionLabel({
          id: 'favorites',
          name: 'Favorites',
          subjectIds: [],
          source: 'user',
          seed: 1,
          createdAt: 0,
          updatedAt: 0,
        }),
      ).toBe('Favorites')
      expect(getCollectionLabel(undefined)).toBe('Collection')
    })
  })
})
