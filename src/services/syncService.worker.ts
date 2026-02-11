import { waniKaniService } from './wanikaniService'
import { subjects, assignments, studyMaterials, users, encounterItems } from './db'
import { WKCollection, Subject, Assignment, StudyMaterial } from '../types'
import _ from 'lodash'
import { getKanaSubjects } from '../utils/kana'
import { transformSubject } from '../utils/transformSubject'
import { flush } from '../utils/flush'
import { encounterService } from './encounterService'
import moment from 'moment'

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

  await flush()

  console.log('All kana removed')

  const kanaSubjects = getKanaSubjects()

  subjects.upsertMany(kanaSubjects)

  console.log('populated %s kana subjects', kanaSubjects.length)

  await flush()
}

export async function syncEncounterItems() {
  const unsyncedEncounterItems = encounterItems.find({ synced: false }).fetch()

  if (unsyncedEncounterItems.length === 0) return

  console.log(`[Sync] Syncing ${unsyncedEncounterItems.length} unsynced encounter items...`)

  // WaniKani allows max 60 requests/min, but we use 45 to be safe
  // Each result sync requires 1 API call
  const BATCH_SIZE = 45
  const BATCH_DELAY = 60000 // 1 minute in ms

  let syncedCount = 0
  let failedCount = 0
  const encounterItemIdsToSync: string[] = []

  // Process in batches to respect rate limit
  for (let i = 0; i < unsyncedEncounterItems.length; i += BATCH_SIZE) {
    const batch = unsyncedEncounterItems.slice(i, i + BATCH_SIZE)

    console.log(
      `[Sync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} encounter items)...`,
    )

    for (const encounterItem of batch) {
      try {
        if (!encounterItem.assignmentId) {
          console.warn(
            `[Sync] No assignment found for subject ${encounterItem.subjectId}, skipping...`,
          )
          continue
        }

        const assignment = assignments.findOne({ id: encounterItem.assignmentId })

        if (!assignment) {
          console.warn(
            `[Sync] No assignment found for subject ${encounterItem.subjectId}, skipping...`,
          )
          continue
        }

        if (!moment(assignment.available_at).isBefore()) {
          console.warn(`[Sync] Assignment ${assignment.id} is not available yet, marking as synced`)

          // remove from queue
          encounterItemIdsToSync.push(encounterItem.id)

          continue
        }

        await waniKaniService.createReview(
          encounterItem.assignmentId,
          encounterItem.correctMeaning ? 0 : 1,
          encounterItem.correctReading ? 0 : 1,
        )

        encounterItemIdsToSync.push(encounterItem.id)
        syncedCount++
      } catch (error) {
        console.error(`[Sync] Failed to sync encounter item ${encounterItem.id}:`, error)
        failedCount++
      }
    }

    // Mark successfully synced encounter items
    if (encounterItemIdsToSync.length > 0) {
      encounterService.markEncounterItemsSynced(encounterItemIdsToSync)
      encounterItemIdsToSync.length = 0 // Clear array
    }

    // If there are more batches to process, wait before next batch
    if (i + BATCH_SIZE < unsyncedEncounterItems.length) {
      console.log(`[Sync] Waiting ${BATCH_DELAY}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }

  console.log(`[Sync] Encounter items sync complete: ${syncedCount} synced, ${failedCount} failed`)
}
