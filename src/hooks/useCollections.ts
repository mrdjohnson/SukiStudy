import { subjectCollections } from '../core/db'
import useReactivity from './useReactivity'
import { Selector } from '@signaldb/core'
import { SubjectCollection } from '../core/types'

type UseCollectionsOptions = {
  /** Include soft-deleted collections (the recycle bin). Defaults to false. */
  includeDeleted?: boolean
}

export const useCollections = ({ includeDeleted = false }: UseCollectionsOptions = {}) => {
  const collections = useReactivity(() => {
    const collectionSelector: Selector<SubjectCollection> = {}

    if (!includeDeleted) {
      // Active collections only — i.e. those without a soft-delete timestamp.
      collectionSelector.isDeleted = undefined
    }

    return subjectCollections.find(collectionSelector, { sort: { updatedAt: -1 } }).fetch()
  }, [includeDeleted])

  return collections
}
