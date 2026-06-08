import { describe, expect, it } from 'vitest'
import { SubjectType } from '../../../src/core/types'
import { allGameItems, availableGameItems, gameItemsToLearn } from '../../../src/core/db/gameItems'
import { assignmentFactory, subjectFactory } from '../../factories'

const now = new Date('2026-06-04T00:00:00.000Z')

describe('game item queries', () => {
  it('returns due review items and kana subjects allowed by preferences', async () => {
    const dueVocabulary = await subjectFactory.create({ id: 1, level: 5 })
    const futureKanji = await subjectFactory.create(
      { id: 2, level: 5 },
      { transient: { type: SubjectType.KANJI } },
    )
    const hiddenRadical = await subjectFactory.create(
      { id: 3, level: 5 },
      { transient: { type: SubjectType.RADICAL } },
    )
    const burnedVocabulary = await subjectFactory.create({ id: 4, level: 5 })
    const outOfLevelVocabulary = await subjectFactory.create({ id: 5, level: 45 })
    const hiragana = await subjectFactory.create(
      { id: -1, level: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )
    await subjectFactory.create({ id: -2, level: 1 }, { transient: { type: SubjectType.KATAKANA } })

    await assignmentFactory.create({ id: 101 }, { transient: { subject: dueVocabulary, now } })
    await assignmentFactory.create(
      { id: 102 },
      { transient: { subject: futureKanji, state: 'futureReview', now } },
    )
    await assignmentFactory.create(
      { id: 103, hidden: true },
      { transient: { subject: hiddenRadical, now } },
    )
    await assignmentFactory.create(
      { id: 104 },
      { transient: { subject: burnedVocabulary, state: 'burned', now } },
    )
    await assignmentFactory.create(
      { id: 105 },
      { transient: { subject: outOfLevelVocabulary, now } },
    )

    const items = availableGameItems({
      gameLevelMin: 1,
      gameLevelMax: 10,
      hiddenSubjects: [SubjectType.KATAKANA],
      now,
    })

    const [hiraganaGameItem, _burnedVocabularyGameItem, dueVocabularyGameItem] = items

    expect(items.map(item => item.subject.id)).toEqual([
      hiragana.id,
      burnedVocabulary.id,
      dueVocabulary.id,
    ])
    expect(hiraganaGameItem.assignment).toBeUndefined()
    expect(dueVocabularyGameItem).toMatchObject({
      assignment: { id: 101 },
      isReviewable: true,
      subject: { id: dueVocabulary.id },
    })
  })

  it('omits kana from review items when kana subject types are not allowed', async () => {
    const dueVocabulary = await subjectFactory.create({ id: 11, level: 3 })
    await subjectFactory.create(
      { id: -11, level: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )

    await assignmentFactory.create({ id: 111 }, { transient: { subject: dueVocabulary, now } })

    const items = availableGameItems({
      hiddenSubjects: [SubjectType.HIRAGANA, SubjectType.KATAKANA],
      now,
    })

    expect(items.map(item => item.subject.id)).toEqual([dueVocabulary.id])
  })

  it('returns unlocked unstarted lesson items without kana', async () => {
    const lessonVocabulary = await subjectFactory.create({ id: 21, level: 4 })
    const lockedVocabulary = await subjectFactory.create({ id: 22, level: 4 })
    const startedVocabulary = await subjectFactory.create({ id: 23, level: 4 })
    const futureVocabulary = await subjectFactory.create({ id: 24, level: 4 })
    const hiddenVocabulary = await subjectFactory.create({ id: 25, level: 4 })
    const hiragana = await subjectFactory.create(
      { id: -21, level: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )

    await assignmentFactory.create(
      { id: 202 },
      { transient: { subject: lockedVocabulary, state: 'lockedLesson', now } },
    )
    await assignmentFactory.create(
      { id: 203 },
      { transient: { subject: startedVocabulary, state: 'startedLesson', now } },
    )
    await assignmentFactory.create(
      { id: 204, unlocked_at: '2026-06-04T06:00:00.000Z' },
      { transient: { subject: futureVocabulary, state: 'lesson', now } },
    )
    await assignmentFactory.create(
      { id: 205, hidden: true },
      { transient: { subject: hiddenVocabulary, state: 'lesson', now } },
    )
    await assignmentFactory.create(
      { id: 201 },
      { transient: { subject: lessonVocabulary, state: 'lesson', now } },
    )

    const items = gameItemsToLearn({
      subjectTypes: [SubjectType.VOCABULARY, SubjectType.HIRAGANA],
      now,
    })

    expect(items.map(item => item.subject.id)).toEqual([lessonVocabulary.id])
    expect(items[0]).toMatchObject({
      assignment: { id: 201 },
      isReviewable: false,
      subject: { id: lessonVocabulary.id },
    })

    const itemsWithKana = gameItemsToLearn({
      subjectTypes: [SubjectType.VOCABULARY, SubjectType.HIRAGANA],
      includeKana: true,
      now,
    })

    expect(itemsWithKana.map(item => item.subject.id)).toEqual([hiragana.id, lessonVocabulary.id])
  })

  it('returns every visible assignment-backed item plus allowed kana', async () => {
    const dueVocabulary = await subjectFactory.create({ id: 31, level: 8 })
    const futureVocabulary = await subjectFactory.create({ id: 32, level: 8 })
    const burnedVocabulary = await subjectFactory.create({ id: 33, level: 8 })
    const hiddenVocabulary = await subjectFactory.create({ id: 34, level: 8 })
    const hiddenTypeKanji = await subjectFactory.create(
      { id: 35, level: 8 },
      { transient: { type: SubjectType.KANJI } },
    )
    const hiragana = await subjectFactory.create(
      { id: -31, level: 1 },
      { transient: { type: SubjectType.HIRAGANA } },
    )

    await assignmentFactory.create({ id: 301 }, { transient: { subject: dueVocabulary, now } })
    await assignmentFactory.create(
      { id: 302 },
      { transient: { subject: futureVocabulary, state: 'futureReview', now } },
    )
    await assignmentFactory.create(
      { id: 303 },
      { transient: { subject: burnedVocabulary, state: 'burned', now } },
    )
    await assignmentFactory.create(
      { id: 304, hidden: true },
      { transient: { subject: hiddenVocabulary, now } },
    )
    await assignmentFactory.create({ id: 305 }, { transient: { subject: hiddenTypeKanji, now } })

    const items = allGameItems({
      hiddenSubjects: [SubjectType.KANJI],
      now,
    })

    expect(items.map(item => item.subject.id)).toEqual([
      hiragana.id,
      dueVocabulary.id,
      futureVocabulary.id,
      burnedVocabulary.id,
    ])
    expect(items.map(item => item.isReviewable)).toEqual([undefined, true, false, true])
  })
})
