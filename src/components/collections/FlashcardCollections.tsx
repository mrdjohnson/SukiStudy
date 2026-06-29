import { useState } from 'react'
import { Sheet } from 'react-modal-sheet'
import { useNavigate } from 'react-router'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconBookmarkPlus, IconEye, IconEyeOff, IconFolder, IconX } from '@tabler/icons-react'
import {
  HIDDEN_COLLECTION_ID,
  removeSubjectFromCollection,
  setSubjectHidden,
} from '../../core/collectionStore'
import { subjectCollections } from '../../core/db'
import type { Subject } from '../../core/types'
import { useIsSubjectHidden } from '../../hooks/useHiddenSubjects'
import useReactivity from '../../hooks/useReactivity'
import { CollectionPicker } from './CollectionPicker'

type FlashcardCollectionsProps = {
  subject: Subject
}

export const FlashcardCollections = ({ subject }: FlashcardCollectionsProps) => {
  const navigate = useNavigate()
  const isHidden = useIsSubjectHidden(subject.id)
  const [bookmarkSubject, setBookmarkSubject] = useState<Subject | null>(null)
  const [showBookmarkSelector, setShowBookmarkSelector] = useState(false)

  const collections = useReactivity(() => {
    return subjectCollections
      .find({}, { sort: { updatedAt: -1 } })
      .fetch()
      .filter(
        collection =>
          collection.id !== HIDDEN_COLLECTION_ID &&
          !collection.isDeleted &&
          collection.subjectIds.includes(subject.id),
      )
  }, [subject.id])

  // Close the flashcard stack and jump to the collection, scrolled to this item.
  const openCollection = (collectionId: string) => {
    modals.closeAll()
    navigate(`/collections/${collectionId}?subject=${subject.id}`)
  }

  const openPicker = () => {
    setBookmarkSubject(subject)
    setShowBookmarkSelector(true)
  }

  return (
    <>
      <section>
        <Group justify="space-between" mb="sm">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Collections
          </h3>

          <Button
            size="xs"
            variant={isHidden ? 'light' : 'subtle'}
            color={isHidden ? 'yellow' : 'gray'}
            leftSection={isHidden ? <IconEye size={14} /> : <IconEyeOff size={14} />}
            onClick={() => void setSubjectHidden(subject.id, !isHidden)}
          >
            {isHidden ? 'Unhide item' : 'Hide item'}
          </Button>
        </Group>

        {isHidden && collections.length > 0 && (
          <Text size="xs" c="yellow" mb="xs">
            This item is hidden but still belongs to the collections below.
          </Text>
        )}

        <Stack gap="xs">
          {collections.map(collection => (
            <Paper key={collection.id} className="p-2 rounded-xl! bg-black/30!">
              <Group wrap="nowrap" gap="xs">
                <UnstyledButton
                  className="flex-1 min-w-0"
                  aria-label={`Open ${collection.name}`}
                  onClick={() => openCollection(collection.id)}
                >
                  <Group wrap="nowrap" gap="xs">
                    <IconFolder size={18} className="shrink-0 text-white/70" />
                    <Text truncate className="font-semibold!">
                      {collection.name}
                    </Text>
                    {collection.source === 'system' && (
                      <Badge size="xs" variant="light">
                        System
                      </Badge>
                    )}
                  </Group>
                </UnstyledButton>

                {collection.source === 'user' && (
                  <Tooltip label="Remove from collection">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Remove from ${collection.name}`}
                      onClick={() => void removeSubjectFromCollection(collection.id, subject.id)}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Paper>
          ))}

          <Button
            variant="light"
            color="gray"
            leftSection={<IconBookmarkPlus size={16} />}
            onClick={openPicker}
          >
            {collections.length > 0 ? 'Add to another collection' : 'Save to a collection'}
          </Button>
        </Stack>
      </section>

      <Sheet
        isOpen={showBookmarkSelector}
        onClose={() => setShowBookmarkSelector(false)}
        onCloseEnd={() => setBookmarkSubject(null)}
        style={{ zIndex: 30 }}
        detent="content"
      >
        <Sheet.Container className="rounded-t-2xl! rounded-b-none! overflow-hidden max-w-3xl! mx-auto! left-0! right-0!">
          <Sheet.Content>
            <Paper className="rounded-none!">
              <Box className="py-4">
                <Center>
                  <Sheet.DragIndicator />
                </Center>
              </Box>

              <CollectionPicker
                subjects={bookmarkSubject ? [bookmarkSubject] : []}
                onDone={() => setShowBookmarkSelector(false)}
              />
            </Paper>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onClick={() => setShowBookmarkSelector(false)} />
      </Sheet>
    </>
  )
}
