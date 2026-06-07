import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assignmentFactory, subjectFactory, userFactory } from '../../test/factories'
import {
  HookTestProviders,
  TEST_NOW,
  resetTestDatabase,
  subjectIdsOf,
} from '../../test/hookTestUtils'
import { assignments, users } from '../core/db'
import { SubjectType } from '../core/types'
import { useAllSubjects } from './useAllSubjects'

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

describe('useAllSubjects', () => {
  it('returns no items and finishes loading when disabled', async () => {
    const subject = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAllSubjects(false), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('combines kana subjects with every assignment-backed subject', async () => {
    const katakana = await subjectFactory.create(
      { id: 2 },
      { transient: { type: SubjectType.KATAKANA } },
    )
    const hiragana = await subjectFactory.create(
      { id: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )

    const dueKanji = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    const futureVocabulary = await subjectFactory.create(
      { id: 102 },
      { transient: { type: SubjectType.VOCABULARY } },
    )
    const lessonRadical = await subjectFactory.create(
      { id: 103 },
      { transient: { type: SubjectType.RADICAL } },
    )

    await assignmentFactory.create(
      { id: 3 },
      { transient: { subject: lessonRadical, state: 'lesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: dueKanji, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: futureVocabulary, state: 'futureReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAllSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(subjectIdsOf(result)).toEqual([
      hiragana.id,
      katakana.id,
      dueKanji.id,
      futureVocabulary.id,
      lessonRadical.id,
    ])
    expect(result.current.items.map(item => item.isReviewable)).toEqual([
      undefined,
      undefined,
      true,
      false,
      false,
    ])
  })

  it('finishes loading without querying when there is no user', async () => {
    users.removeMany({})

    const { result } = renderHook(() => useAllSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('reruns when assignment data changes', async () => {
    const kanji = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    const radical = await subjectFactory.create(
      { id: 102 },
      { transient: { type: SubjectType.RADICAL } },
    )
    const assignment = await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: kanji, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useAllSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([kanji.id]))

    act(() => {
      assignments.updateOne(
        { id: assignment.id },
        {
          $set: {
            subject_id: radical.id,
            subject_type: SubjectType.RADICAL,
          },
        },
      )
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([radical.id]))
  })
})
