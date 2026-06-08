import { afterEach, vi } from 'vitest'
import { setup } from 'vitest-indexeddb'

export const mockWorkerOps = {
  syncUser: vi.fn().mockResolvedValue(undefined),
  migrateSubjects: vi.fn().mockResolvedValue(undefined),
  migrateKanaVocabSubjects: vi.fn().mockResolvedValue(undefined),
  syncSubjects: vi.fn().mockResolvedValue(undefined),
  migrateAssignments: vi.fn().mockResolvedValue(undefined),
  syncAssignments: vi.fn().mockResolvedValue(undefined),
  syncStudyMaterials: vi.fn().mockResolvedValue(undefined),
  populateKana: vi.fn().mockResolvedValue(undefined),
  syncEncounterItems: vi.fn().mockResolvedValue(undefined),
  setToken: vi.fn().mockResolvedValue(undefined),
  clearData: vi.fn().mockResolvedValue(undefined),
  postMessage: vi.fn(),
  terminate: vi.fn(),
}

// Mock ComlinkWorker globally
;(globalThis as any).ComlinkWorker = class ComlinkWorker {
  constructor() {
    // Return the shared mock object so we can spy on it
    return mockWorkerOps
  }
} as any

// Mock Worker just in case
;(globalThis as any).Worker = (globalThis as any).ComlinkWorker as any

setup()

afterEach(async () => {
  vi.clearAllMocks()

  const { subjects, assignments, studyMaterials, users, preferences } =
    await import('../src/core/db')

  await Promise.all([
    subjects.isReady(),
    assignments.isReady(),
    studyMaterials.isReady(),
    users.isReady(),
    preferences.isReady(),
  ])

  subjects.removeMany({})
  assignments.removeMany({})
  studyMaterials.removeMany({})
  users.removeMany({})
  preferences.removeMany({})
})
