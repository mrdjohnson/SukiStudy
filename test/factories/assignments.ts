import { faker } from '@faker-js/faker'
import { Factory } from 'fishery'
import { SubjectType } from '../../src/core/types'
import type { Assignment, Subject } from '../../src/core/types'
import { assignments } from '../../src/core/db'

type AssignmentState =
  | 'burned'
  | 'dueReview'
  | 'futureReview'
  | 'lesson'
  | 'lockedLesson'
  | 'startedLesson'

type AssignmentTransientParams = {
  now?: Date | number | string
  state?: AssignmentState
  subject?: Subject
}

const toDate = (value: Date | number | string | undefined) => {
  if (!value) return new Date()
  if (value instanceof Date) return value

  return new Date(value)
}

const hoursFrom = (date: Date, hours: number) => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()
}

const stateParams = (state: AssignmentState, now: Date): Partial<Assignment> => {
  const unlockedAt = hoursFrom(now, -48)
  const startedAt = hoursFrom(now, -47)

  switch (state) {
    case 'lesson':
      return {
        srs_stage: 0,
        unlocked_at: unlockedAt,
        started_at: null,
        passed_at: null,
        burned_at: null,
        available_at: null,
      }
    case 'lockedLesson':
      return {
        srs_stage: 0,
        unlocked_at: null,
        started_at: null,
        passed_at: null,
        burned_at: null,
        available_at: null,
      }
    case 'startedLesson':
      return {
        srs_stage: 0,
        unlocked_at: unlockedAt,
        started_at: startedAt,
        passed_at: null,
        burned_at: null,
        available_at: null,
      }
    case 'futureReview':
      return {
        srs_stage: 2,
        unlocked_at: unlockedAt,
        started_at: startedAt,
        passed_at: null,
        burned_at: null,
        available_at: hoursFrom(now, 6),
      }
    case 'burned':
      return {
        srs_stage: 9,
        unlocked_at: unlockedAt,
        started_at: startedAt,
        passed_at: hoursFrom(now, -24),
        burned_at: hoursFrom(now, -1),
        available_at: hoursFrom(now, -6),
      }
    case 'dueReview':
    default:
      return {
        srs_stage: 1,
        unlocked_at: unlockedAt,
        started_at: startedAt,
        passed_at: null,
        burned_at: null,
        available_at: hoursFrom(now, -1),
      }
  }
}

export const assignmentFactory = Factory.define<Assignment, AssignmentTransientParams, Assignment>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(assignment => {
      assignments.insert(assignment)

      return assignment
    })

    const now = toDate(transientParams.now)
    const subject = transientParams.subject
    const subjectType = subject?.object ?? SubjectType.VOCABULARY

    return {
      id: sequence,
      created_at: faker.date.past().toISOString(),
      subject_id: subject?.id ?? sequence,
      subject_type: subjectType,
      srs_stage: 1,
      unlocked_at: null,
      started_at: null,
      passed_at: null,
      burned_at: null,
      available_at: null,
      resurrected_at: null,
      hidden: false,
      ...stateParams(transientParams.state ?? 'dueReview', now),
    }
  },
)
