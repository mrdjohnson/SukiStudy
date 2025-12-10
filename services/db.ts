import { Collection, createIndex } from '@signaldb/core';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import maverickjsReactivityAdapter from '@signaldb/maverickjs';
import { Subject, Assignment, StudyMaterial, User } from '../types';

// Initialize Collections with explicit generic types matching the data structure
// SignalDB requires an 'id' field for persistence/reactivity
export const subjects = new Collection<Subject & { id: number }>({
  persistence: createIndexedDBAdapter('subjects'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('object'), createIndex('level')]
});

export const assignments = new Collection<Assignment & { id: number }>({
  persistence: createIndexedDBAdapter('assignments'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('subject_id'), createIndex('srs_stage'), createIndex('available_at')]
});

export const studyMaterials = new Collection<StudyMaterial & { id: number }>({
  persistence: createIndexedDBAdapter('study_materials'),
  reactivity: maverickjsReactivityAdapter,
  indices: [createIndex('id'), createIndex('subject_id')]
});

export const users = new Collection<User & { id: string }>({
  persistence: createIndexedDBAdapter('users'),
  reactivity: maverickjsReactivityAdapter,
});