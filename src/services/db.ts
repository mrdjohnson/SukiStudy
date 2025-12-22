import { Collection, createIndex } from '@signaldb/core'
import createIndexedDBAdapter from '@signaldb/indexeddb'
import maverickjsReactivityAdapter from '@signaldb/maverickjs'
import { Subject, Assignment, StudyMaterial, User } from '../types'

// Extended Collection class with upsertMany method
class ExtendedCollection<T extends { id: string | number } & object> extends Collection<T> {
  upsertMany(items: T[]): void {
    this.batch(() => {
      for (const item of items) {
        this.updateOne({ id: item.id } as any, { $set: item }, { upsert: true })
      }
    })
  }
}

// Initialize Collections with explicit generic types matching the data structure
// SignalDB requires an 'id' field for persistence/reactivity
export const subjects = new ExtendedCollection<Subject & { id: number }>({
  persistence: createIndexedDBAdapter('subjects'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('object'), createIndex('level')],
  transform: subject => {
    let object = subject.object

    if (!object && subject.document_url) {
      if (subject.document_url.startsWith('https://www.wanikani.com/radicals')) {
        object = 'radical'
      } else if (subject.document_url.startsWith('https://www.wanikani.com/kanji')) {
        object = 'kanji'
      } else {
        console.error('missing object for subject: ', subject)
      }
    }

    return {
      ...subject,
      object,
    }
  },
})

export const assignments = new ExtendedCollection<Assignment & { id: number }>({
  persistence: createIndexedDBAdapter('assignments'),
  reactivity: maverickjsReactivityAdapter,
  indices: [
    createIndex('id'),
    createIndex('subject_id'),
    createIndex('srs_stage'),
    createIndex('available_at'),
  ],
})

export const studyMaterials = new ExtendedCollection<StudyMaterial & { id: number }>({
  persistence: createIndexedDBAdapter('study_materials'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('subject_id')],
})

export const users = new ExtendedCollection<User & { id: string }>({
  persistence: createIndexedDBAdapter('users'),
  reactivity: maverickjsReactivityAdapter,
})
