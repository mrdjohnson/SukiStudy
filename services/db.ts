import { Collection } from '@signaldb/core';
import { IndexedDBAdapter } from '@signaldb/indexeddb';
import { maverickjsReactivityAdapter } from '@signaldb/maverickjs';
import { Subject, Assignment, StudyMaterial, User } from '../types';

// Create a persistence adapter factory
const createPersistenceAdapter = <T extends { id: any }>(collectionName: string) => {
  return new IndexedDBAdapter<T>('SukiStudyDB', collectionName);
};

// Initialize Collections with explicit generic types matching the data structure
// SignalDB requires an 'id' field for persistence/reactivity
export const subjects = new Collection<Subject & { id: number }>({
  persistence: createPersistenceAdapter('subjects'),
  reactivity: maverickjsReactivityAdapter,
  indices: ['id', 'object', 'level']
});

export const assignments = new Collection<Assignment & { id: number }>({
  persistence: createPersistenceAdapter('assignments'),
  reactivity: maverickjsReactivityAdapter,
  indices: ['id', 'subject_id', 'srs_stage', 'available_at']
});

export const studyMaterials = new Collection<StudyMaterial & { id: number }>({
  persistence: createPersistenceAdapter('study_materials'),
  reactivity: maverickjsReactivityAdapter,
  indices: ['id', 'subject_id']
});

export const users = new Collection<User & { id: string }>({
  persistence: createPersistenceAdapter('users'),
  reactivity: maverickjsReactivityAdapter,
});