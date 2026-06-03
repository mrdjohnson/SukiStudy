import { Collection, createIndex } from '@signaldb/core'
import maverickjsReactivityAdapter from '@signaldb/maverickjs'
import { createSyncedIndexedDBAdapter } from '../signalDbPersistence'
import type {
  Subject,
  Assignment,
  StudyMaterial,
  User,
  Encounter,
  EncounterItem,
  Preferences,
} from '../types'
import { initLogService, LogEntry } from '../logService'

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
  persistence: createSyncedIndexedDBAdapter('subjects'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('object'), createIndex('level')],
})

export const assignments = new ExtendedCollection<Assignment & { id: number }>({
  persistence: createSyncedIndexedDBAdapter('assignments'),
  reactivity: maverickjsReactivityAdapter,
  indices: [
    createIndex('id'),
    createIndex('subject_id'),
    createIndex('srs_stage'),
    createIndex('available_at'),
  ],
})

export const studyMaterials = new ExtendedCollection<StudyMaterial & { id: number }>({
  persistence: createSyncedIndexedDBAdapter('study_materials'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('subject_id')],
})

export const users = new ExtendedCollection<User & { id: string }>({
  persistence: createSyncedIndexedDBAdapter('users'),
  reactivity: maverickjsReactivityAdapter,
})

export const preferences = new ExtendedCollection<Preferences>({
  persistence: createSyncedIndexedDBAdapter('preferences'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id')],
})

export const logs = new ExtendedCollection<LogEntry>({
  persistence: createSyncedIndexedDBAdapter('logs'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('timestamp'), createIndex('level')],
})

initLogService(logs)

export const encounters = new ExtendedCollection<Encounter>({
  persistence: createSyncedIndexedDBAdapter('encounters'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('gameId'), createIndex('startedAt')],
})

export const encounterItems = new ExtendedCollection<EncounterItem>({
  persistence: createSyncedIndexedDBAdapter('encounter_items'),
  reactivity: maverickjsReactivityAdapter,
  indices: [
    createIndex('id'),
    createIndex('sessionId'),
    createIndex('gameId'),
    createIndex('subjectId'),
    createIndex('timestamp'),
  ],
})
