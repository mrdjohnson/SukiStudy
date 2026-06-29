import { MultiSelect } from '@mantine/core'
import { HIDDEN_COLLECTION_ID } from '../../core/collectionStore'
import { useCollections } from '../../hooks/useCollections'

type CollectionMultiSelectProps = {
  label: string
  description?: string
  value: string[]
  onChange: (value: string[]) => void
}

export const CollectionMultiSelect = ({
  label,
  description,
  value,
  onChange,
}: CollectionMultiSelectProps) => {
  const collections = useCollections().filter(collection => collection.id !== HIDDEN_COLLECTION_ID)

  return (
    <MultiSelect
      label={label}
      description={description}
      placeholder={collections.length === 0 ? 'Create a collection first' : 'All items'}
      data={collections.map(collection => ({
        value: collection.id,
        label: `${collection.name} (${collection.subjectIds.length})`,
      }))}
      value={value}
      onChange={onChange}
      clearable
      searchable
      nothingFoundMessage="No collections found"
    />
  )
}
