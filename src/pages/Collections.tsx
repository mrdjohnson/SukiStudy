import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Container,
  Group,
  InputClearButton,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconCopy,
  IconLock,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react'
import _ from 'lodash'
import { CollectionWordCloud } from '../components/collections/CollectionWordCloud'
import { modals } from '@mantine/modals'
import {
  HIDDEN_COLLECTION_ID,
  createSubjectCollection,
  deleteSubjectCollection,
  duplicateSubjectCollection,
  permanentlyDeleteSubjectCollection,
  removeSubjectFromCollection,
  renameSubjectCollection,
  restoreSubjectCollection,
} from '../core/collectionStore'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useHiddenSubjectIds } from '../hooks/useHiddenSubjects'
import { subjects as subjectsCollection } from '../core/db'
import type { Subject, SubjectCollection } from '../core/types'
import { useCollections } from '../hooks/useCollections'
import useReactivity from '../hooks/useReactivity'
import { CollectionDetail } from './CollectionDetail'

const getSubjectSearchText = (subjectId: number, subjectsById: Record<number, Subject>) => {
  const subject = subjectsById[subjectId]
  if (!subject) return ''

  return [
    subject.characters,
    subject.slug,
    ...subject.meanings.map(meaning => meaning.meaning),
    ...(subject.readings?.map(reading => reading.reading) || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const getCollectionSubjects = (
  collection: SubjectCollection,
  subjectsById: Record<number, Subject>,
) => {
  return collection.subjectIds.flatMap(subjectId => {
    const subject = subjectsById[subjectId]

    return subject ? [subject] : []
  })
}

export const Collections = () => {
  const collections = useCollections()
  const allCollections = useCollections({ includeDeleted: true })
  const navigate = useNavigate()
  const { collectionId } = useParams()
  const [isPending, runAction] = useAsyncAction()
  const [query, setQuery] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Opening a collection resets the search, so returning to the list starts
  // fresh instead of restoring the previous filter.
  useEffect(() => {
    if (collectionId) setQuery('')
  }, [collectionId])

  const clearQuery = () => {
    setQuery('')
    searchInputRef.current?.focus()
  }

  const deletedCollections = useMemo(
    () => allCollections.filter(collection => collection.isDeleted),
    [allCollections],
  )

  const hiddenSubjectIds = useHiddenSubjectIds()

  const subjectsById = useReactivity(() => {
    return _.keyBy(subjectsCollection.find({}).fetch(), 'id')
  }, [])

  const selectedCollection = collectionId
    ? collections.find(collection => collection.id === collectionId)
    : undefined

  const filteredCollections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return collections

    return collections.filter(collection => {
      const subjectText = collection.subjectIds
        .map(subjectId => getSubjectSearchText(subjectId, subjectsById))
        .join(' ')

      return [collection.name, collection.description, subjectText]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [collections, query, subjectsById])

  const exactCollectionMatch = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return undefined

    return collections.find(collection => collection.name.trim().toLowerCase() === normalizedQuery)
  }, [collections, query])

  const createCollection = () => {
    const name = query.trim()
    if (!name || exactCollectionMatch) return

    runAction(async () => {
      const collection = await createSubjectCollection({ name })
      setQuery('')
      navigate(`/collections/${collection.id}`)
    })
  }

  const deleteCollection = (id: string) => {
    const collection = collections.find(item => item.id === id)

    modals.openConfirmModal({
      title: 'Delete collection?',
      children: (
        <Text size="sm">
          {collection ? `"${collection.name}"` : 'This collection'} will be moved to deleted
          collections. Saved items are not affected and you can restore it later.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        runAction(async () => {
          await deleteSubjectCollection(id)
          if (collectionId === id) navigate('/collections')
        })
      },
    })
  }

  const duplicateCollection = (id: string) => {
    runAction(async () => {
      const copy = await duplicateSubjectCollection(id)
      if (copy) navigate(`/collections/${copy.id}`)
    })
  }

  const restoreCollection = (id: string) => {
    runAction(async () => {
      await restoreSubjectCollection(id)
    })
  }

  const permanentlyDeleteCollection = (id: string) => {
    const collection = deletedCollections.find(item => item.id === id)

    modals.openConfirmModal({
      title: 'Delete forever?',
      children: (
        <Text size="sm">
          {collection ? `"${collection.name}"` : 'This collection'} will be permanently deleted.
          This cannot be undone. Saved items are not affected.
        </Text>
      ),
      labels: { confirm: 'Delete forever', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        runAction(async () => {
          await permanentlyDeleteSubjectCollection(id)
        })
      },
    })
  }

  const removeCollectionSubject = (id: string, subjectId: number) => {
    runAction(async () => {
      await removeSubjectFromCollection(id, subjectId)
    })
  }

  const renameCollection = (id: string, name: string) => {
    runAction(async () => {
      await renameSubjectCollection(id, name)
    })
  }

  if (collectionId) {
    if (!selectedCollection) {
      return (
        <Container size="lg" className="size-full max-w-full px-2! sm:px-2! md:px-4!">
          <Stack gap="lg">
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                radius="xl"
                aria-label="Back to collections"
                onClick={() => navigate('/collections')}
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Title order={2}>Collection not found</Title>
            </Group>
            <Text c="dimmed">This collection may have been deleted or is no longer available.</Text>
          </Stack>
        </Container>
      )
    }

    return (
      <CollectionDetail
        collection={selectedCollection}
        subjects={getCollectionSubjects(selectedCollection, subjectsById)}
        onBack={() => navigate('/collections')}
        onDelete={deleteCollection}
        onDuplicate={duplicateCollection}
        onRemoveSubject={removeCollectionSubject}
        onRename={renameCollection}
        hiddenSubjectIds={hiddenSubjectIds}
        isPending={isPending}
      />
    )
  }

  return (
    <Container size="lg" className="size-full max-w-full px-2! sm:px-2! md:px-4!">
      <Stack gap="lg" className="pb-4">
        <Group wrap="nowrap">
          <TextInput
            ref={searchInputRef}
            radius="xl"
            placeholder="Search or create collections..."
            value={query}
            onChange={event => setQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              <InputClearButton
                onMouseDown={event => event.preventDefault()}
                onClick={clearQuery}
                hidden={!query}
              />
            }
            className="flex-1"
          />

          <Tooltip
            label={
              exactCollectionMatch
                ? 'A collection with this name already exists'
                : 'Create collection'
            }
          >
            <ActionIcon
              variant="filled"
              radius="xl"
              size="lg"
              aria-label="Create collection"
              onClick={createCollection}
              disabled={!query.trim() || !!exactCollectionMatch}
              loading={isPending}
            >
              <IconPlus size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {filteredCollections.map(collection => {
            const subjects = getCollectionSubjects(collection, subjectsById)
            const isHiddenCollection = collection.id === HIDDEN_COLLECTION_ID

            return (
              <Paper key={collection.id} withBorder radius="lg" p="sm" className="overflow-hidden">
                <Group wrap="nowrap" align="stretch" gap="sm">
                  <UnstyledButton
                    aria-label={`View ${collection.name}`}
                    onClick={() => navigate(`/collections/${collection.id}`)}
                    className="shrink-0"
                  >
                    {isHiddenCollection ? (
                      <Center className="size-24 rounded-xl border border-white/10 bg-black/30 text-gray-500">
                        <IconLock size={28} />
                      </Center>
                    ) : (
                      <CollectionWordCloud
                        collection={collection}
                        subjects={subjects}
                        className="size-24"
                      />
                    )}
                  </UnstyledButton>

                  <Stack gap={4} justify="space-between" className="min-w-0 flex-1">
                    <UnstyledButton
                      aria-label={`View ${collection.name}`}
                      onClick={() => navigate(`/collections/${collection.id}`)}
                      className="min-w-0 text-left"
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={800} truncate>
                          {collection.name}
                        </Text>
                        {collection.source === 'system' && (
                          <Badge size="xs" variant="light">
                            System
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {collection.subjectIds.length} item
                        {collection.subjectIds.length === 1 ? '' : 's'}
                      </Text>
                    </UnstyledButton>

                    {!isHiddenCollection && (
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Duplicate">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={`Duplicate ${collection.name}`}
                            onClick={() => duplicateCollection(collection.id)}
                            loading={isPending}
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={`Delete ${collection.name}`}
                            onClick={() => deleteCollection(collection.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    )}
                  </Stack>
                </Group>
              </Paper>
            )
          })}
        </SimpleGrid>

        {filteredCollections.length === 0 && (
          <Center py="xl">
            <Text c="dimmed">No collections match your search.</Text>
          </Center>
        )}

        {deletedCollections.length > 0 && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed" fw={700} tt="uppercase">
                Deleted collections ({deletedCollections.length})
              </Text>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setShowDeleted(value => !value)}
              >
                {showDeleted ? 'Hide' : 'Show'}
              </Button>
            </Group>

            {showDeleted && (
              <Stack gap="xs">
                {deletedCollections.map(collection => (
                  <Paper key={collection.id} withBorder radius="md" p="xs">
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Stack gap={0} className="min-w-0">
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={600} truncate>
                            {collection.name}
                          </Text>
                          {collection.source === 'system' && (
                            <Badge size="xs" variant="light">
                              System
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {collection.subjectIds.length} item
                          {collection.subjectIds.length === 1 ? '' : 's'}
                        </Text>
                      </Stack>

                      <Group gap="xs" wrap="nowrap" className="shrink-0">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconArrowBackUp size={14} />}
                          onClick={() => restoreCollection(collection.id)}
                          loading={isPending}
                        >
                          Restore
                        </Button>
                        <Tooltip label="Delete forever">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={`Delete ${collection.name} forever`}
                            onClick={() => permanentlyDeleteCollection(collection.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
