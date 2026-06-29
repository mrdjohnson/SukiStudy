import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
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
  useMatches,
} from '@mantine/core'
import {
  IconArrowBackUp,
  IconBell,
  IconBellOff,
  IconBookmarkOff,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconEyeOff,
  IconLayoutDashboard,
  IconLock,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import _ from 'lodash'
import { CollectionWordCloud } from '../components/collections/CollectionWordCloud'
import { CollectionBrowseAdd } from '../components/collections/CollectionBrowseAdd'
import { GameItemIcon } from '../components/GameItemIcon'
import { openFlashcardModal } from '../components/modals/FlashcardModal'
import { useSettings } from '../contexts/SettingsContext'
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
import { SubjectType } from '../core/types'
import type { Subject, SubjectCollection } from '../core/types'
import { useCollections } from '../hooks/useCollections'
import useReactivity from '../hooks/useReactivity'

const SUBJECT_TYPE_ORDER = [
  SubjectType.HIRAGANA,
  SubjectType.KATAKANA,
  SubjectType.RADICAL,
  SubjectType.KANJI,
  SubjectType.VOCABULARY,
]

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

const getSubjectTitle = (subject: Subject) => {
  return subject.meanings.find(meaning => meaning.primary)?.meaning || subject.meanings[0]?.meaning
}

const getSubjectSubtitle = (subject: Subject) => {
  return subject.meanings
    .filter(meaning => !meaning.primary)
    .map(meaning => meaning.meaning)
    .join(', ')
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

type CollectionDetailProps = {
  collection: SubjectCollection
  subjects: Subject[]
  onBack: () => void
  onDelete: (collectionId: string) => void
  onDuplicate: (collectionId: string) => void
  onRemoveSubject: (collectionId: string, subjectId: number) => void
  onRename: (collectionId: string, name: string) => void
  hiddenSubjectIds: Set<number>
  isPending: boolean
}

const CollectionDetail = ({
  collection,
  subjects,
  onBack,
  onDelete,
  onDuplicate,
  onRemoveSubject,
  onRename,
  hiddenSubjectIds,
  isPending,
}: CollectionDetailProps) => {
  const navigate = useNavigate()
  const isMobile = useMatches({ base: true, sm: false })
  const {
    dashboardCollectionIds,
    setDashboardCollectionIds,
    setDashboardSubjectSource,
    notificationCollectionIds,
    setNotificationCollectionIds,
  } = useSettings()
  const [searchParams] = useSearchParams()
  const highlightedSubjectId = searchParams.get('subject')
  const [isEditingName, nameEditHandlers] = useDisclosure(false)
  const [draftName, setDraftName] = useState(collection.name)
  const isDashboardCollection = dashboardCollectionIds.includes(collection.id)
  const isNotificationCollection = notificationCollectionIds.includes(collection.id)

  const startRename = () => {
    setDraftName(collection.name)
    nameEditHandlers.open()
  }

  const saveRename = () => {
    onRename(collection.id, draftName)
    nameEditHandlers.close()
  }

  const cancelRename = () => {
    setDraftName(collection.name)
    nameEditHandlers.close()
  }

  const subjectGroups = useMemo(() => {
    return _.groupBy(subjects, subject => subject.object || SubjectType.VOCABULARY)
  }, [subjects])

  const orderedSubjectGroups = useMemo(() => {
    return SUBJECT_TYPE_ORDER.flatMap(subjectType => {
      const groupSubjects = subjectGroups[subjectType]

      return groupSubjects ? [{ subjectType, subjects: groupSubjects }] : []
    })
  }, [subjectGroups])

  const toggleDashboardCollection = () => {
    const nextCollectionIds = isDashboardCollection
      ? dashboardCollectionIds.filter(collectionId => collectionId !== collection.id)
      : _.uniq([...dashboardCollectionIds, collection.id])

    setDashboardCollectionIds(nextCollectionIds)

    if (!isDashboardCollection) {
      setDashboardSubjectSource('collections')
    }
  }

  const toggleNotificationCollection = () => {
    const nextCollectionIds = isNotificationCollection
      ? notificationCollectionIds.filter(collectionId => collectionId !== collection.id)
      : _.uniq([...notificationCollectionIds, collection.id])

    setNotificationCollectionIds(nextCollectionIds)
  }

  const startPractice = () => {
    navigate(`/session/custom?collections=${collection.id}&select=all`)
  }

  const openBrowseAdd = () => {
    modals.open({
      title: `Add items to ${collection.name}`,
      fullScreen: isMobile,
      size: 'xl',
      children: <CollectionBrowseAdd collectionId={collection.id} />,
    })
  }

  // When arriving from a flashcard ("open collection"), scroll to and briefly
  // highlight the originating item.
  useEffect(() => {
    if (!highlightedSubjectId) return

    const element = document.getElementById(`collection-subject-${highlightedSubjectId}`)
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('ring-2', 'ring-primary', 'rounded-lg')

    const timer = setTimeout(() => {
      element.classList.remove('ring-2', 'ring-primary', 'rounded-lg')
    }, 2200)

    return () => clearTimeout(timer)
  }, [highlightedSubjectId, subjects])

  // The hidden collection never lists its items; show a locked summary instead.
  if (collection.id === HIDDEN_COLLECTION_ID) {
    return (
      <Container size="lg" className="size-full max-w-full px-2! sm:px-2! md:px-4!">
        <Stack gap="lg" className="pb-4">
          <Group gap="xs" wrap="nowrap" className="min-w-0">
            <ActionIcon
              variant="subtle"
              radius="xl"
              aria-label="Back to collections"
              onClick={onBack}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Stack gap={0} className="min-w-0">
              <Group gap="xs" wrap="nowrap">
                <Title order={2} className="truncate">
                  {collection.name}
                </Title>
                <Badge size="sm" variant="light">
                  System
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {collection.subjectIds.length} hidden item
                {collection.subjectIds.length === 1 ? '' : 's'}
              </Text>
            </Stack>
          </Group>

          <Paper withBorder radius="md" p="xl">
            <Stack align="center" gap="sm">
              <IconLock size={32} className="text-gray-500" />
              <Text fw={600}>Hidden items are kept private</Text>
              <Text size="sm" c="dimmed" ta="center" className="max-w-md">
                Items you hide are not listed here and won&apos;t appear on the dashboard or in
                study sessions. Unhide an item from its flashcard, or from another collection it
                belongs to.
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    )
  }

  return (
    <Container size="lg" className="size-full max-w-full px-2! sm:px-2! md:px-4!">
      <Stack gap="lg" className="pb-4">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" className="min-w-0">
            <ActionIcon
              variant="subtle"
              radius="xl"
              aria-label="Back to collections"
              onClick={onBack}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>

            <Stack gap={0} className="min-w-0 flex-1">
              {isEditingName ? (
                <TextInput
                  value={draftName}
                  onChange={event => setDraftName(event.currentTarget.value)}
                  onBlur={saveRename}
                  onKeyDown={event => {
                    if (event.key === 'Enter') saveRename()
                    if (event.key === 'Escape') cancelRename()
                  }}
                  data-autofocus
                  autoFocus
                  size="md"
                  aria-label="Collection name"
                  rightSection={
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      aria-label="Save name"
                      onMouseDown={event => event.preventDefault()}
                      onClick={saveRename}
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                  }
                />
              ) : (
                <Group gap="xs" wrap="nowrap" className="min-w-0">
                  <Title order={2} className="truncate">
                    {collection.name}
                  </Title>
                  {collection.source === 'system' ? (
                    <Badge size="sm" variant="light">
                      System
                    </Badge>
                  ) : (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label="Rename collection"
                      onClick={startRename}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  )}
                </Group>
              )}
              <Text size="sm" c="dimmed">
                {subjects.length} item{subjects.length === 1 ? '' : 's'}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs" wrap="nowrap" className="shrink-0">
            <Tooltip label="Duplicate collection">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Duplicate ${collection.name}`}
                onClick={() => onDuplicate(collection.id)}
                loading={isPending}
              >
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Delete collection">
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Delete ${collection.name}`}
                onClick={() => onDelete(collection.id)}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Paper withBorder radius="md" p="md" className="overflow-hidden">
          <Group align="stretch" wrap="nowrap">
            <CollectionWordCloud
              collection={collection}
              subjects={subjects}
              className="hidden min-h-28 w-52 shrink-0 sm:block"
            />

            <Stack justify="space-between" className="min-w-0 flex-1">
              {collection.description && (
                <Box>
                  <Text size="sm" c="dimmed">
                    {collection.description}
                  </Text>
                </Box>
              )}

              <Group gap="xs">
                <Button
                  leftSection={
                    isDashboardCollection ? (
                      <IconBookmarkOff size={16} />
                    ) : (
                      <IconLayoutDashboard size={16} />
                    )
                  }
                  variant={isDashboardCollection ? 'light' : 'filled'}
                  onClick={toggleDashboardCollection}
                >
                  {isDashboardCollection ? 'Hide from Dashboard' : 'Show on Dashboard'}
                </Button>

                <Button
                  leftSection={
                    isNotificationCollection ? <IconBellOff size={16} /> : <IconBell size={16} />
                  }
                  variant={isNotificationCollection ? 'light' : 'default'}
                  onClick={toggleNotificationCollection}
                >
                  {isNotificationCollection ? 'Mute Reminders' : 'Use in Reminders'}
                </Button>

                <Button
                  leftSection={<IconPlayerPlay size={16} />}
                  variant="light"
                  onClick={startPractice}
                  disabled={subjects.length === 0}
                >
                  Practice
                </Button>

                {collection.source === 'user' && (
                  <Button
                    leftSection={<IconPlus size={16} />}
                    variant="default"
                    onClick={openBrowseAdd}
                  >
                    Add items
                  </Button>
                )}
              </Group>
            </Stack>
          </Group>
        </Paper>

        {subjects.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No items saved in this collection yet.</Text>
          </Center>
        ) : (
          <Stack gap="xl">
            {orderedSubjectGroups.map(({ subjectType, subjects: groupSubjects }) => (
              <Box key={subjectType}>
                <Group justify="space-between" mb="sm">
                  <Title order={3}>{_.startCase(subjectType)}</Title>
                  <Badge variant="light" color="gray">
                    {groupSubjects.length} items
                  </Badge>
                </Group>

                <Paper withBorder radius="md" className="overflow-hidden">
                  {groupSubjects.map((subject, index) => {
                    const isLast = index === groupSubjects.length - 1
                    const title = getSubjectTitle(subject)
                    const subtitle = getSubjectSubtitle(subject)

                    return (
                      <Box key={subject.id} id={`collection-subject-${subject.id}`}>
                        <Group className="p-3 md:p-4 flex-nowrap hover:bg-gray-50! dark:hover:bg-gray-800! transition-colors">
                          <UnstyledButton
                            onClick={() => openFlashcardModal(groupSubjects, index)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <Group wrap="nowrap">
                              <GameItemIcon subject={subject} />

                              <div className="flex-1 min-w-0">
                                <Group gap="xs" align="center" mb={4}>
                                  <Text fw={700} truncate>
                                    {title}
                                  </Text>
                                  <Group gap={4}>
                                    {subject.readings
                                      ?.filter(reading => reading.primary)
                                      .map(reading => (
                                        <Badge
                                          key={reading.reading}
                                          size="md"
                                          variant="dot"
                                          className="bg-gray-200! dark:bg-gray-700! before:bg-black! dark:before:bg-gray-500!"
                                        >
                                          {reading.reading}
                                        </Badge>
                                      ))}
                                  </Group>
                                </Group>

                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {subtitle || subject.slug}
                                </Text>
                              </div>
                            </Group>
                          </UnstyledButton>

                          <Group gap="xs" wrap="nowrap">
                            {hiddenSubjectIds.has(subject.id) && (
                              <Tooltip label="This item is hidden">
                                <IconEyeOff size={16} className="text-yellow-500" />
                              </Tooltip>
                            )}

                            <Badge variant="light" color="gray" size="sm">
                              Level {subject.level}
                            </Badge>

                            {collection.source === 'user' && (
                              <Tooltip label="Remove from collection">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  aria-label={`Remove ${subject.characters || subject.slug} from ${collection.name}`}
                                  loading={isPending}
                                  onClick={() => onRemoveSubject(collection.id, subject.id)}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}

                            <IconChevronRight
                              size={18}
                              className="text-gray-600 dark:text-gray-400"
                            />
                          </Group>
                        </Group>

                        {!isLast && <Divider className="mx-1" c="dimmed" />}
                      </Box>
                    )
                  })}
                </Paper>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}

export const Collections = () => {
  const collections = useCollections()
  const allCollections = useCollections({ includeDeleted: true })
  const navigate = useNavigate()
  const { collectionId } = useParams()
  const [isPending, runAction] = useAsyncAction()
  const [query, setQuery] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

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
            radius="xl"
            placeholder="Search or create collections..."
            value={query}
            onChange={event => setQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={<InputClearButton onClick={() => setQuery('')} hidden={!query} />}
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
