import { HIDDEN_COLLECTION_ID } from '../core/collectionStore'
import { subjectCollections } from '../core/db'
import useReactivity from './useReactivity'

const readHiddenSubjectIds = () => {
  const hidden = subjectCollections.findOne({ id: HIDDEN_COLLECTION_ID })
  if (!hidden || hidden.isDeleted) return []

  return hidden.subjectIds
}

/** Reactive set of subject ids currently in the hidden collection. */
export const useHiddenSubjectIds = () => {
  return useReactivity(() => new Set(readHiddenSubjectIds()), [])
}

/** Reactive flag for whether a single subject is hidden. */
export const useIsSubjectHidden = (subjectId?: number) => {
  return useReactivity(() => {
    if (subjectId == null) return false

    return readHiddenSubjectIds().includes(subjectId)
  }, [subjectId])
}
