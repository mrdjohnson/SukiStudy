import { waniKaniService } from './wanikaniService'
import { subjects, assignments, studyMaterials, users } from './db'
import { WKCollection, Subject, Assignment, StudyMaterial } from '../types'
import moment from 'moment'

const SYNC_KEYS = {
  USER: 'wk_last_sync_user',
  SUBJECTS: 'wk_last_sync_subjects',
  ASSIGNMENTS: 'wk_last_sync_assignments',
  MATERIALS: 'wk_last_sync_materials',
}

async function fetchAllPages<T>(
  initialRequest: () => Promise<WKCollection<T>>,
  onPage: (items: T[]) => Promise<void>,
) {
  let response = await initialRequest()

  if (response.data.length > 0) {
    await onPage(response.data.map(d => ({ ...d.data, id: d.id })))
  }

  while (response.pages.next_url && response.data.length > 0) {
    console.log(`[Sync] Fetching next page...`)
    response = await waniKaniService.request<WKCollection<T>>(response.pages.next_url)
    if (response.data.length > 0) {
      await onPage(response.data.map(d => ({ ...d.data, object: d.object, url: d.url, id: d.id })))
    }
  }
}

export const syncService = {
  async sync() {
    if (!navigator.onLine) {
      console.log('[Sync] Offline, skipping sync.')
      return
    }

    const token = localStorage.getItem('wk_token')
    if (!token) return

    console.log('[Sync] Starting synchronization...')

    try {
      await this.syncUser()

      await this.syncSubjects()
      await this.syncAssignments()
      await this.syncStudyMaterials()

      console.log('[Sync] Synchronization complete.')
    } catch (error) {
      console.error('[Sync] Error during sync:', error)
    }
  },

  async syncUser() {
    const lastUserSync = localStorage.getItem(SYNC_KEYS.USER)
    const userStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastUserSync))) {
      return
    }

    const waniUser = await waniKaniService.getUser()
    users.updateOne({ id: 'current' }, { $set: { ...waniUser.data, id: 'current' } }) // Upsert by ID usually handled by clean/insert or find

    localStorage.setItem(SYNC_KEYS.USER, userStart)
  },

  async syncSubjects() {
    const lastSubjectSync = localStorage.getItem(SYNC_KEYS.SUBJECTS)
    const subjectsStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastSubjectSync))) {
      return
    }

    await fetchAllPages<Subject>(
      () => waniKaniService.getSubjectsUpdatedAfter(lastSubjectSync || undefined),
      async items => {
        // SignalDB handles upserts if ID matches
        items.forEach(item => {
          // Check if exists to determine insert vs update (SignalDB implementation specific)
          // For Simplicity in v0.8 we often remove then insert or use upsert if available
          // Here we just remove matches and insert
          subjects.removeOne({ id: item.id })
          subjects.insert(item)
        })
      },
    )
    localStorage.setItem(SYNC_KEYS.SUBJECTS, subjectsStart)
  },

  async syncAssignments() {
    const lastAssignSync = localStorage.getItem(SYNC_KEYS.ASSIGNMENTS)
    const assignStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastAssignSync))) {
      return
    }

    await fetchAllPages<Assignment>(
      () => waniKaniService.getAssignmentsUpdatedAfter(lastAssignSync || undefined),
      async items => {
        items.forEach(item => {
          assignments.removeOne({ id: item.id })
          assignments.insert(item)
        })
      },
    )

    localStorage.setItem(SYNC_KEYS.ASSIGNMENTS, assignStart)
  },

  async syncStudyMaterials() {
    const lastMatSync = localStorage.getItem(SYNC_KEYS.MATERIALS)
    const matStart = new Date().toISOString()

    if (moment().subtract(10, 'minutes').isBefore(moment(lastMatSync))) {
      return
    }

    await fetchAllPages<StudyMaterial>(
      () => waniKaniService.getStudyMaterialsUpdatedAfter(lastMatSync || undefined),
      async items => {
        items.forEach(item => {
          studyMaterials.removeOne({ id: item.id })
          studyMaterials.insert(item as any)
        })
      },
    )

    localStorage.setItem(SYNC_KEYS.MATERIALS, matStart)
  },

  async clearData() {
    subjects.removeMany({})
    assignments.removeMany({})
    studyMaterials.removeMany({})
    users.removeMany({})
    localStorage.removeItem(SYNC_KEYS.SUBJECTS)
    localStorage.removeItem(SYNC_KEYS.ASSIGNMENTS)
    localStorage.removeItem(SYNC_KEYS.MATERIALS)
  },
}
