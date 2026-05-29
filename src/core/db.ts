import { Collection, createIndex } from '@signaldb/core'
import createIndexedDBAdapter from '@signaldb/indexeddb'
import maverickjsReactivityAdapter from '@signaldb/maverickjs'
import type {
  Subject,
  Assignment,
  StudyMaterial,
  User,
  Encounter,
  EncounterItem,
  Preferences,
} from '../types'
import { initLogService } from './logService'

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

export const preferences = new ExtendedCollection<Preferences>({
  persistence: createIndexedDBAdapter('preferences'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id')],
})

export interface LogEntry {
  id: string
  timestamp?: string // deprecated
  level: 'log' | 'error' | 'warn' | 'info' | 'debug'
  message: string
  time: number
}

export const logs = new ExtendedCollection<LogEntry>({
  persistence: createIndexedDBAdapter('logs'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('timestamp'), createIndex('level')],
})

initLogService(logs)

export const encounters = new ExtendedCollection<Encounter>({
  persistence: createIndexedDBAdapter('encounters'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('gameId'), createIndex('startedAt')],
})

export const encounterItems = new ExtendedCollection<EncounterItem>({
  persistence: createIndexedDBAdapter('encounter_items'),
  reactivity: maverickjsReactivityAdapter,
  indices: [
    createIndex('id'),
    createIndex('sessionId'),
    createIndex('gameId'),
    createIndex('subjectId'),
    createIndex('timestamp'),
  ],
})
