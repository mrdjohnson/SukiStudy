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
import { assignments } from '../core/db'
import { SubjectType } from '../core/types'
import { useLearnedSubjects } from './useLearnedSubjects'

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

describe('useLearnedSubjects', () => {
  it('returns no items and finishes loading when disabled', async () => {
    const subject = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useLearnedSubjects(false), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('combines kana with learned assignment subjects inside the selected level range', async () => {
    const hiragana = await subjectFactory.create(
      { id: 1, level: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )
    const katakana = await subjectFactory.create(
      { id: 2, level: 60 },
      { transient: { type: SubjectType.KATAKANA } },
    )

    const dueKanji = await subjectFactory.create(
      { id: 101, level: 12 },
      { transient: { type: SubjectType.KANJI } },
    )
    const futureVocabulary = await subjectFactory.create(
      { id: 102, level: 12 },
      { transient: { type: SubjectType.VOCABULARY } },
    )
    const lessonRadical = await subjectFactory.create(
      { id: 103, level: 12 },
      { transient: { type: SubjectType.RADICAL } },
    )
    const outOfRangeKanji = await subjectFactory.create(
      { id: 104, level: 61 },
      { transient: { type: SubjectType.KANJI } },
    )

    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: dueKanji, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: futureVocabulary, state: 'futureReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 3 },
      { transient: { subject: lessonRadical, state: 'lesson', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 4 },
      { transient: { subject: outOfRangeKanji, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useLearnedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(subjectIdsOf(result)).toEqual([hiragana.id, katakana.id, dueKanji.id])
    expect(result.current.items.map(item => item.isReviewable)).toEqual([
      undefined,
      undefined,
      true,
    ])
  })

  it('applies game-specific hidden subjects from settings overrides', async () => {
    localStorage.setItem(
      'suki_game_overrides',
      JSON.stringify({
        quiz: {
          overrideDefaults: true,
          hiddenSubjects: [SubjectType.KANJI],
        },
      }),
    )

    const hiragana = await subjectFactory.create(
      { id: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )
    const hiddenKanji = await subjectFactory.create(
      { id: 101 },
      { transient: { type: SubjectType.KANJI } },
    )
    const visibleRadical = await subjectFactory.create(
      { id: 102 },
      { transient: { type: SubjectType.RADICAL } },
    )

    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: hiddenKanji, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: visibleRadical, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useLearnedSubjects(true, 'quiz'), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([hiragana.id, visibleRadical.id]))
  })

  it('uses content preferences for level bounds', async () => {
    await seedContentPreferences({ gameLevelMin: 5, gameLevelMax: 10 })

    const lowLevel = await subjectFactory.create(
      { id: 101, level: 4 },
      { transient: { type: SubjectType.KANJI } },
    )
    const inRange = await subjectFactory.create(
      { id: 102, level: 7 },
      { transient: { type: SubjectType.KANJI } },
    )
    const highLevel = await subjectFactory.create(
      { id: 103, level: 11 },
      { transient: { type: SubjectType.KANJI } },
    )

    await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: lowLevel, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: inRange, state: 'dueReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 3 },
      { transient: { subject: highLevel, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useLearnedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(subjectIdsOf(result)).toEqual([inRange.id])
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

    const futureAssignment = await assignmentFactory.create(
      { id: 1 },
      { transient: { subject: kanji, state: 'futureReview', now: TEST_NOW } },
    )
    await assignmentFactory.create(
      { id: 2 },
      { transient: { subject: radical, state: 'dueReview', now: TEST_NOW } },
    )

    const { result } = renderHook(() => useLearnedSubjects(), {
      wrapper: HookTestProviders,
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([radical.id]))

    act(() => {
      assignments.updateOne(
        { id: futureAssignment.id },
        { $set: { available_at: hoursFromTestNow(-2) } },
      )
    })

    await waitFor(() => expect(subjectIdsOf(result)).toEqual([kanji.id, radical.id]))
  })
})
