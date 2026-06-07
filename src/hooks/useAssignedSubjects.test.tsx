import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assignmentFactory, subjectFactory, userFactory } from '../../test/factories'
import {
  HookTestProviders,
  TEST_NOW,
  hoursFromTestNow,
  resetTestDatabase,
  seedContentPreferences,
  subjectIdsOf,
} from '../../test/hookTestUtils'
import { subjects, users } from '../core/db'
import { SubjectType } from '../core/types'
import { useAssignedSubjects } from './useAssignedSubjects'

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(TEST_NOW)
  localStorage.clear()
  await resetTestDatabase()
  await userFactory.create({ id: 'current' })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useAssignedSubjects', () => {
  it('returns no items when there is no user', async () => {
    users.removeMany({})

    const lessonSubject = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: lessonSubject, state: 'lesson', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAssignedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('returns unlocked assignments at srs stage zero in assignment order', async () => {
    await seedContentPreferences({ hiddenSubjects: [SubjectType.VOCABULARY] })

    const firstUnlockedLessonSubject = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    const futureLessonSubject = await subjectFactory.create(
      { id: 102 },
      { transient: { type: SubjectType.KANJI } },
    )
    const secondUnlockedLessonSubject = await subjectFactory.create(
      { id: 103 },
      { transient: { type: SubjectType.RADICAL } },
    )
    const reviewSubject = await subjectFactory.create(
      { id: 104 },
      { transient: { type: SubjectType.KANJI } },
    )
    const lockedLessonSubject = await subjectFactory.create(
      { id: 105 },
      { transient: { type: SubjectType.KANJI } },
    )
    const hiddenLessonSubject = await subjectFactory.create(
      { id: 106 },
      { transient: { type: SubjectType.VOCABULARY } },
    )

    const secondUnlockedLessonAssignment = await assignmentFactory.create(
      { id: 3, unlocked_at: hoursFromTestNow(-1) },
      { transient: { subject: secondUnlockedLessonSubject, state: 'lesson', now: TEST_NOW } },
    )
    const firstUnlockedLessonAssignment = await assignmentFactory.create(
      { id: 1, unlocked_at: hoursFromTestNow(-48) },
      { transient: { subject: firstUnlockedLessonSubject, state: 'lesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2, unlocked_at: hoursFromTestNow(1) },
      { transient: { subject: futureLessonSubject, state: 'lesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 4 },
      { transient: { subject: reviewSubject, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 5 },
      { transient: { subject: lockedLessonSubject, state: 'lockedLesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 6, unlocked_at: hoursFromTestNow(-72) },
      { transient: { subject: hiddenLessonSubject, state: 'lesson', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAssignedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(subjectIdsOf(result)).toEqual([
      firstUnlockedLessonSubject.id,
      secondUnlockedLessonSubject.id,
    ])
    expect(result.current.items.map(item => item.assignment?.id)).toEqual([
      firstUnlockedLessonAssignment.id,
      secondUnlockedLessonAssignment.id,
    ])
  })

  it('finishes with no items when there are no unlocked assignments to learn', async () => {
    const futureKanji = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    const lockedRadical = await subjectFactory.create(
      { id: 102 },
      { transient: { type: SubjectType.RADICAL } },
    )

    await assignmentFactory.create(
      { id: 1, unlocked_at: hoursFromTestNow(1) },
      { transient: { subject: futureKanji, state: 'lesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: lockedRadical, state: 'lockedLesson', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAssignedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('reruns when subject data changes', async () => {
    await seedContentPreferences({ hiddenSubjects: [SubjectType.VOCABULARY] })

    const visibleLessonSubject = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: visibleLessonSubject, state: 'lesson', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAssignedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([visibleLessonSubject.id]))

    act(() => {
      subjects.updateOne(
        { id: visibleLessonSubject.id },
        { $set: { object: SubjectType.VOCABULARY } },
      )
    })

    await waitFor(() => expect(result.current.items).toEqual([]))
  })
})
