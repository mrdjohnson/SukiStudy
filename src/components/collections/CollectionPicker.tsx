import { useMemo, useState } from 'react'
import { Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core'
import { IconBookmarkPlus, IconCheck, IconPlus, IconX } from '@tabler/icons-react'
import _ from 'lodash'
import {
  HIDDEN_COLLECTION_ID,
  addSubjectsToCollection,
  createSubjectCollection,
  removeSubjectsFromCollection,
} from '../../core/collectionStore'
import { subjects as subjectsCollection } from '../../core/db'
import type { Subject } from '../../core/types'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useCollections } from '../../hooks/useCollections'
import useReactivity from '../../hooks/useReactivity'
import { CollectionWordCloud } from './CollectionWordCloud'

type CollectionPickerProps = {
  subjects: Subject[]
  onDone?: () => void
}

export const CollectionPicker = ({ subjects, onDone }: CollectionPickerProps) => {
  const collections = useCollections().filter(collection => collection.id !== HIDDEN_COLLECTION_ID)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, runAction] = useAsyncAction()

  const allSubjectsById = useReactivity(() => {
    return _.keyBy(subjectsCollection.find({}).fetch(), 'id')
  }, [])

  const subjectIds = useMemo(() => {
    return _.chain(subjects).map('id').uniq().compact().value()
  }, [subjects])

  const collectionSubjects = (subjectIds: number[]) => {
    return subjectIds.flatMap(subjectId => {
      const subject = allSubjectsById[subjectId]

      return subject ? [subject] : []
    })
  }

  const itemLabel = `${subjects.length} item${subjects.length === 1 ? '' : 's'}`

  const addToCollection = (collectionId: string, collectionName: string) => {
    runAction(async () => {
      await addSubjectsToCollection(collectionId, subjectIds)
      setStatus(`Added ${itemLabel} to ${collectionName}.`)
    })
  }

  const removeFromCollection = (collectionId: string, collectionName: string) => {
    runAction(async () => {
      await removeSubjectsFromCollection(collectionId, subjectIds)
      setStatus(`Removed ${itemLabel} from ${collectionName}.`)
    })
  }

  const createAndAdd = () => {
    const collectionName = name.trim()
    if (!collectionName) return

    runAction(async () => {
      const collection = await createSubjectCollection({
        name: collectionName,
        subjectIds,
      })

      setName('')
      setStatus(`Created ${collection.name} with ${itemLabel}.`)
    })
  }

  return (
    <Stack gap="md" p="md" pt={0}>
      <Stack gap={4}>
        <Text fw={700}>Save to collection</Text>
        <Text size="sm" c="dimmed">
          Add or remove {itemLabel} from your study groups.
        </Text>
      </Stack>

      <Group align="end" gap="xs" wrap="nowrap">
        <TextInput
          label="New collection"
          placeholder="Favorites, tricky kanji, exam prep..."
          value={name}
          onChange={event => setName(event.currentTarget.value)}
          className="flex-1"
        />
        <Button
          onClick={createAndAdd}
          disabled={!name.trim()}
          loading={isPending}
          leftSection={<IconPlus size={16} />}
        >
          Create
        </Button>
      </Group>

      <Stack gap="xs">
        {collections.map(collection => {
          const existingCount = _.intersection(collection.subjectIds, subjectIds).length
          const isMember = existingCount === subjectIds.length && subjectIds.length > 0
          const isSystemCollection = collection.source === 'system'

          return (
            <Paper key={collection.id} withBorder p="xs" radius="md">
              <Group wrap="nowrap" align="stretch">
                <CollectionWordCloud
                  collection={collection}
                  subjects={collectionSubjects(collection.subjectIds)}
                  className="w-28 min-h-20 shrink-0"
                  maxWords={6}
                />

                <Stack gap={2} className="min-w-0 flex-1">
                  <Group gap="xs" wrap="nowrap" align="flex-start">
                    <Text fw={700} className="min-w-0 flex-1">
                      {collection.name}
                    </Text>
                    {collection.source === 'system' && (
                      <Text size="xs" c="dimmed" className="shrink-0">
                        System
                      </Text>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {collection.subjectIds.length} items
                    {existingCount > 0 ? `, ${existingCount} already in` : ''}
                  </Text>
                  {collection.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {collection.description}
                    </Text>
                  )}
                </Stack>

                {isSystemCollection ? (
                  <Button variant="default" disabled className="self-center">
                    System
                  </Button>
                ) : isMember ? (
                  <Button
                    variant="light"
                    color="red"
                    loading={isPending}
                    onClick={() => removeFromCollection(collection.id, collection.name)}
                    leftSection={<IconX size={16} />}
                    className="self-center"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="filled"
                    loading={isPending}
                    onClick={() => addToCollection(collection.id, collection.name)}
                    leftSection={
                      existingCount > 0 ? <IconCheck size={16} /> : <IconBookmarkPlus size={16} />
                    }
                    className="self-center"
                  >
                    {existingCount > 0 ? 'Add rest' : 'Add'}
                  </Button>
                )}
              </Group>
            </Paper>
          )
        })}
      </Stack>

      {collections.length === 0 && (
        <Text size="sm" c="dimmed" ta="center">
          Create your first collection to start saving items.
        </Text>
      )}

      {status && (
        <Text size="sm" c="green">
          {status}
        </Text>
      )}

      {onDone && (
        <Button variant="subtle" onClick={onDone}>
          Done
        </Button>
      )}
    </Stack>
  )
}
