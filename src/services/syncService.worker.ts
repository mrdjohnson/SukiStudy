import { waniKaniService } from './wanikaniService'
import { subjects, assignments, studyMaterials, users } from './db'
import { WKCollection, Subject, Assignment, StudyMaterial } from '../types'
import _ from 'lodash'
import { transformSubject } from '../utils/transformSubject'

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
