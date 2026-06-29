import { assignments, subjectCollections, subjects } from './'
import { HIDDEN_COLLECTION_ID } from '../collectionStore'
import { SubjectType } from '../types'
import type { Assignment, ContentPreferenceState, GameItem, Subject } from '../types'

export type GameItemQueryOptions = Pick<
  ContentPreferenceState,
  'hiddenSubjects' | 'gameLevelMin' | 'gameLevelMax'
> & {
  collectionIds?: string[]
  includeKana?: boolean
  now?: Date | number | string
  subjectTypes?: SubjectType[]
}

const KANA_SUBJECT_TYPES = [SubjectType.HIRAGANA, SubjectType.KATAKANA]
const DEFAULT_SUBJECT_TYPES = Object.values(SubjectType)

const toTimestamp = (value: Date | number | string) => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value

  return new Date(value).getTime()
}

const getAllowedSubjectTypes = ({
  hiddenSubjects = [],
  subjectTypes = DEFAULT_SUBJECT_TYPES,
}: Pick<GameItemQueryOptions, 'hiddenSubjects' | 'subjectTypes'>) => {
  return subjectTypes.filter(subjectType => !hiddenSubjects.includes(subjectType))
}

const getLevelRange = ({
  gameLevelMin = 1,
  gameLevelMax = 60,
}: Pick<GameItemQueryOptions, 'gameLevelMin' | 'gameLevelMax'>) => ({
  gameLevelMin,
  gameLevelMax,
})

// Subjects the user has hidden are excluded from every study/dashboard pool.
const getHiddenSubjectIdSet = () => {
  const hiddenCollection = subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })
  // A soft-deleted hidden collection means nothing is hidden.
  if (!hiddenCollection || hiddenCollection.isDeleted || hiddenCollection.subjectIds.length === 0) {
    return null
  }

  return new Set(hiddenCollection.subjectIds)
}

const getCollectionSubjectIdSet = (collectionIds?: string[]) => {
  if (!collectionIds || collectionIds.length === 0) return null

  const selectedCollections = subjectCollections
    .find({ id: { $in: collectionIds }, isDeleted: undefined })
    .fetch()

  const subjectIds = selectedCollections.flatMap(collection => collection.subjectIds)

  return new Set(subjectIds)
}

const getKanaGameItems = (
  subjectTypes: SubjectType[],
  { gameLevelMin, gameLevelMax }: ReturnType<typeof getLevelRange>,
  collectionSubjectIds: Set<number> | null,
): GameItem[] => {
  const kanaSubjectTypes = KANA_SUBJECT_TYPES.filter(subjectType =>
    subjectTypes.includes(subjectType),
  )

  if (kanaSubjectTypes.length === 0) return []

  const kanaSubjects = subjects
    .find(
      {
        isKana: true,
        object: { $in: kanaSubjectTypes },
        level: { $gte: gameLevelMin, $lte: gameLevelMax },
      },
      { sort: { id: 1 } },
    )
    .fetch()
    .filter(subject => !collectionSubjectIds || collectionSubjectIds.has(subject.id))

  return kanaSubjects.map(subject => ({
    subject,
  }))
}

const getAssignmentSubjects = (
  fetchedAssignments: Assignment[],
  subjectTypes: SubjectType[],
  { gameLevelMin, gameLevelMax }: ReturnType<typeof getLevelRange>,
  collectionSubjectIds: Set<number> | null,
) => {
  const subjectIds = fetchedAssignments
    .map(assignment => assignment.subject_id)
    .filter(subjectId => !collectionSubjectIds || collectionSubjectIds.has(subjectId))

  if (subjectIds.length === 0) return new Map<number, Subject>()

  const matchingSubjects = subjects
    .find({
      id: { $in: subjectIds },
      object: { $in: subjectTypes },
      level: { $gte: gameLevelMin, $lte: gameLevelMax },
    })
    .fetch()

  return new Map(matchingSubjects.map(subject => [subject.id, subject]))
}

const buildAssignmentGameItems = (
  fetchedAssignments: Assignment[],
  subjectMap: Map<number, Subject>,
  now: number,
) => {
  return fetchedAssignments.flatMap<GameItem>(assignment => {
    const subject = subjectMap.get(assignment.subject_id)

    if (!subject) return []

    return [
      {
        subject,
        assignment,
        isReviewable: assignment.available_at ? toTimestamp(assignment.available_at) <= now : false,
      },
    ]
  })
}

const buildGameItems = (
  fetchedAssignments: Assignment[],
  options: GameItemQueryOptions,
): GameItem[] => {
  const now = toTimestamp(options.now ?? new Date())
  const allowedSubjectTypes = getAllowedSubjectTypes(options)
  const levelRange = getLevelRange(options)
  const collectionSubjectIds = getCollectionSubjectIdSet(options.collectionIds)
  const subjectMap = getAssignmentSubjects(
    fetchedAssignments,
    allowedSubjectTypes,
    levelRange,
    collectionSubjectIds,
  )
  const assignmentItems = buildAssignmentGameItems(fetchedAssignments, subjectMap, now)
  const kanaItems: GameItem[] =
    options.includeKana === false
      ? []
      : getKanaGameItems(allowedSubjectTypes, levelRange, collectionSubjectIds)

  const hiddenSubjectIds = getHiddenSubjectIdSet()
  const items = [...kanaItems, ...assignmentItems]

  return hiddenSubjectIds ? items.filter(item => !hiddenSubjectIds.has(item.subject.id)) : items
}

export const availableGameItems = (options: GameItemQueryOptions) => {
  const now = toTimestamp(options.now ?? new Date())

  const reviewAssignments = assignments
    .find(
      {
        // burned_at: { $ne: null },
        srs_stage: { $gt: 0 },
        hidden: false,
      },
      { sort: { available_at: 1 } },
    )
    .fetch()
    .filter(assignment => {
      return !!assignment.available_at && toTimestamp(assignment.available_at) <= now
    })

  return buildGameItems(reviewAssignments, options)
}

export const gameItemsToLearn = ({ includeKana = false, ...options }: GameItemQueryOptions) => {
  const now = toTimestamp(options.now ?? new Date())

  const lessonAssignments = assignments
    .find({ srs_stage: 0, hidden: false }, { sort: { unlocked_at: 1 } })
    .fetch()
    .filter(assignment => {
      return (
        !assignment.started_at &&
        !!assignment.unlocked_at &&
        toTimestamp(assignment.unlocked_at) <= now
      )
    })

  return buildGameItems(lessonAssignments, { ...options, includeKana })
}

export const allGameItems = (options: GameItemQueryOptions) => {
  const allAssignments = assignments.find({ hidden: false }, { sort: { subject_id: 1 } }).fetch()

  return buildGameItems(allAssignments, options)
}

/**
 * Items for the subjects saved in the given collections, resolved directly from
 * the subject catalog rather than from assignments. Collections are arbitrary
 * groups of subjects, so a saved subject should show up even when the user has
 * no assignment for it yet.
 */
export const collectionGameItems = (options: GameItemQueryOptions): GameItem[] => {
  const collectionSubjectIds = getCollectionSubjectIdSet(options.collectionIds)

  if (!collectionSubjectIds || collectionSubjectIds.size === 0) return []

  const allowedSubjectTypes = getAllowedSubjectTypes(options)
  const { gameLevelMin, gameLevelMax } = getLevelRange(options)

  const hiddenSubjectIds = getHiddenSubjectIdSet()

  const matchingSubjects = subjects
    .find(
      {
        id: { $in: [...collectionSubjectIds] },
        object: { $in: allowedSubjectTypes },
        level: { $gte: gameLevelMin, $lte: gameLevelMax },
      },
      { sort: { id: 1 } },
    )
    .fetch()
    .filter(subject => !hiddenSubjectIds?.has(subject.id))

  return matchingSubjects.map(subject => ({ subject }))
}
