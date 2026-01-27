import { waniKaniService } from './wanikaniService'
import { subjects, assignments, studyMaterials, users, results } from './db'
import { WKCollection, Subject, Assignment, StudyMaterial } from '../types'
import _ from 'lodash'
import { getKanaSubjects } from '../utils/kana'
import { transformSubject } from '../utils/transformSubject'
import { flush } from '../utils/flush'
import { offlineGameService } from './offlineGameService'

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

export function setToken(token: string) {
  waniKaniService.setToken(token)
}

export async function syncUser() {
  const waniUser = await waniKaniService.getUser()
  users.updateOne({ id: 'current' }, { $set: { ...waniUser.data, id: 'current' } }) // Upsert by ID usually handled by clean/insert or find
}

export async function migrateSubjects() {
  const emptySubjects = subjects.find({ object: { $eq: undefined } }).fetch()

  console.log('migrating %s subjects', emptySubjects.length)

  subjects.batch(() => {
    emptySubjects.forEach(subject => {
      const transformed = transformSubject(subject)

      subjects.updateOne({ id: subject.id }, { $set: transformed })
    })
  })

  console.log(
    'migration complete, %s broken subjects left',
    subjects.find({ object: { $eq: undefined } }).count(),
  )
}

export async function syncSubjects(lastSubjectSync: string | null) {
  await fetchAllPages<Subject>(
    () => waniKaniService.getSubjectsUpdatedAfter(lastSubjectSync || undefined),
    async items => {
      subjects.upsertMany(items.map(transformSubject))
      console.log('inserted or updated: %s items', items.length)
    },
  )
}

export async function migrateAssignments() {
  const emptyAssignments = assignments.find({ srs_stage: -1 }).fetch()

  console.log('migrating %s assignments', emptyAssignments.length)

  assignments.batch(() => {
    emptyAssignments.forEach(assignment => {
      assignments.updateOne({ id: assignment.id }, { $set: { ...assignment, srs_stage: 1 } })
    })
  })

  console.log(
    'migration complete, %s broken assignments left',
    assignments.find({ srs_stage: -1 }).count(),
  )
}

export async function syncAssignments(lastAssignSync: string | null) {
  await fetchAllPages<Assignment>(
    () => waniKaniService.getAssignmentsUpdatedAfter(lastAssignSync || undefined),
    async items => {
      assignments.upsertMany(items)
      console.log('inserted or updated: %s items', items.length)
    },
  )
}

export async function syncStudyMaterials(lastMatSync: string | null) {
  await fetchAllPages<StudyMaterial>(
    () => waniKaniService.getStudyMaterialsUpdatedAfter(lastMatSync || undefined),
    async items => {
      studyMaterials.upsertMany(items)
      console.log('inserted or updated: %s items', items.length)
    },
  )
}

export async function clearData() {
  subjects.removeMany({})
  assignments.removeMany({})
  studyMaterials.removeMany({})
  users.removeMany({})
}

export async function populateKana() {
  subjects.removeMany({ id: { $lt: 0 } })

  console.log('All kana removed')

  await flush()

  const kanaSubjects = getKanaSubjects()

  subjects.insertMany(kanaSubjects)

  console.log('populated %s kana subjects', kanaSubjects.length)
}

export async function syncUnsyncedResults() {
  const unsyncedResults = results.find({ synced: false }).fetch()

  if (unsyncedResults.length === 0) return

  console.log(`[Sync] Syncing ${unsyncedResults.length} unsynced results...`)

  // WaniKani allows max 60 requests/min, but we use 45 to be safe
  // Each result sync requires 1 API call
  const BATCH_SIZE = 45
  const BATCH_DELAY = 60000 // 1 minute in ms

  let syncedCount = 0
  let failedCount = 0
  const resultIdsToMarkSynced: string[] = []

  // Process in batches to respect rate limit
  for (let i = 0; i < unsyncedResults.length; i += BATCH_SIZE) {
    const batch = unsyncedResults.slice(i, i + BATCH_SIZE)

    console.log(
      `[Sync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} results)...`,
    )

    for (const result of batch) {
      try {
        if (!result.assignmentId) {
          console.warn(`[Sync] No assignment found for subject ${result.subjectId}, skipping...`)
          continue
        }

        await waniKaniService.createReview(
          result.assignmentId,
          result.correctMeaning ? 0 : 1,
          result.correctReading ? 0 : 1,
        )

        resultIdsToMarkSynced.push(result.id)
        syncedCount++
      } catch (error) {
        console.error(`[Sync] Failed to sync result ${result.id}:`, error)
        failedCount++
      }
    }

    // Mark successfully synced results
    if (resultIdsToMarkSynced.length > 0) {
      offlineGameService.markResultsSynced(resultIdsToMarkSynced)
      resultIdsToMarkSynced.length = 0 // Clear array
    }

    // If there are more batches to process, wait before next batch
    if (i + BATCH_SIZE < unsyncedResults.length) {
      console.log(`[Sync] Waiting ${BATCH_DELAY}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }

  console.log(`[Sync] Results sync complete: ${syncedCount} synced, ${failedCount} failed`)
}
