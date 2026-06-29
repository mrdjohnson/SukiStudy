import React, { useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Chip,
  Divider,
  Group,
  InputClearButton,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  useMatches,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconCheck, IconMinus, IconPlus, IconSearch } from '@tabler/icons-react'
import _ from 'lodash'
import { SubjectType } from '../../core/types'
import type { Subject } from '../../core/types'
import { subjectCollections, subjects as subjectsCollection } from '../../core/db'
import { addSubjectsToCollection, removeSubjectsFromCollection } from '../../core/collectionStore'
import { colorByType } from '../../utils/subject'
import { toHiragana, toRomanji } from '../../utils/kana'
import { GameItemIcon } from '../GameItemIcon'
import { openFlashcardModal } from '../modals/FlashcardModal'
import { useSettings } from '../../contexts/SettingsContext'
import useReactivity from '../../hooks/useReactivity'

type CollectionBrowseAddProps = {
  collectionId: string
}

type BrowseSubject = {
  subject: Subject
  romanjis: string[]
}

const TYPE_ORDER = [
  SubjectType.HIRAGANA,
  SubjectType.KATAKANA,
  SubjectType.RADICAL,
  SubjectType.KANJI,
  SubjectType.VOCABULARY,
]

export const CollectionBrowseAdd = ({ collectionId }: CollectionBrowseAddProps) => {
  const { availableSubjects } = useSettings()
  const [types, setTypes] = useState<string[]>(availableSubjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [levels, setLevels] = useState<number[]>([])
  const [showLevelSelect, levelSelect] = useDisclosure(false)
  const [showLimit, setShowLimit] = useState(60)

  const limitStep = useMatches({ base: 30, sm: 60 })

  useEffect(() => {
    setShowLimit(limitStep)
  }, [limitStep])

  // Current membership, reactive so the +/- buttons stay in sync as we toggle.
  const memberIds = useReactivity(() => {
    const collection = subjectCollections.findOne({ id: collectionId })

    return new Set<number>(collection?.subjectIds ?? [])
  }, [collectionId])

  const allTypeSubjects = useReactivity(() => {
    const query = types.length > 0 ? { object: { $in: types } } : {}

    return subjectsCollection
      .find(query, { sort: { level: 1, id: 1 } })
      .fetch()
      .map<BrowseSubject>(subject => ({
        subject,
        romanjis: _.map(subject.readings, reading => toRomanji(reading.reading)),
      }))
  }, [types])

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const kanaQuery = toHiragana(query)
    const romanjiQuery = toRomanji(query)

    return allTypeSubjects.filter(({ subject, romanjis }) => {
      if (levels.length > 0 && !levels.includes(subject.level)) return false

      if (query) {
        const matchMeaning = subject.meanings.some(meaning =>
          meaning.meaning.toLowerCase().includes(query),
        )
        const matchReading = romanjis.some(reading => reading.includes(romanjiQuery))
        const matchChar =
          subject.characters?.includes(query) || subject.characters?.includes(kanaQuery)

        if (!matchMeaning && !matchReading && !matchChar) return false
      }

      return true
    })
  }, [allTypeSubjects, levels, searchQuery])

  const visibleItems = filteredItems.slice(0, showLimit)
  const groups = useMemo(() => _.groupBy(visibleItems, item => item.subject.object), [visibleItems])

  const toggleLevel = (level: number) => {
    setLevels(prev =>
      prev.includes(level) ? prev.filter(value => value !== level) : [...prev, level],
    )
  }

  const toggleMember = (subjectId: number, isMember: boolean) => {
    if (isMember) void removeSubjectsFromCollection(collectionId, [subjectId])
    else void addSubjectsToCollection(collectionId, [subjectId])
  }

  const addAll = () => {
    void addSubjectsToCollection(
      collectionId,
      filteredItems.map(item => item.subject.id),
    )
  }

  const allFilteredAreMembers =
    filteredItems.length > 0 && filteredItems.every(item => memberIds.has(item.subject.id))

  return (
    <Stack gap="md">
      <Group wrap="nowrap">
        <TextInput
          radius="xl"
          placeholder="Search English, kana, or romaji..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={event => setSearchQuery(event.currentTarget.value)}
          rightSection={
            <InputClearButton onClick={() => setSearchQuery('')} hidden={!searchQuery} />
          }
          className="flex-1"
        />
        <Button variant="default" onClick={levelSelect.open}>
          {levels.length === 0
            ? 'Levels'
            : levels.length > 3
              ? `${levels.length} levels`
              : `Lv ${levels.join(', ')}`}
        </Button>
      </Group>

      <Chip.Group multiple value={types} onChange={setTypes}>
        <Group gap="xs">
          {TYPE_ORDER.filter(type => availableSubjects.includes(type)).map(type => (
            <Chip key={type} value={type} variant="outline" color={colorByType[type]}>
              {_.startCase(type)}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'}
        </Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addAll}
          disabled={filteredItems.length === 0 || allFilteredAreMembers}
        >
          Add all
        </Button>
      </Group>

      {filteredItems.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No items match your filters.</Text>
        </Center>
      ) : (
        <Stack gap="xl">
          {TYPE_ORDER.map(type => {
            const groupItems = groups[type]
            if (!groupItems) return null

            return (
              <Box key={type}>
                <Group justify="space-between" mb="sm">
                  <Text fw={700}>{_.startCase(type)}</Text>
                  <Badge variant="light" color="gray">
                    {groupItems.length}
                  </Badge>
                </Group>

                <Paper withBorder radius="md" className="overflow-hidden">
                  {groupItems.map(({ subject }, index) => {
                    const isMember = memberIds.has(subject.id)
                    const isLast = index === groupItems.length - 1

                    return (
                      <React.Fragment key={subject.id}>
                        <Group className="p-3 flex-nowrap" wrap="nowrap">
                          <UnstyledButton
                            onClick={() => openFlashcardModal([subject], 0)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <Group wrap="nowrap">
                              <GameItemIcon subject={subject} />
                              <div className="flex-1 min-w-0">
                                <Text fw={700} truncate>
                                  {subject.meanings?.[0]?.meaning}
                                </Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {subject.characters || subject.slug} · Level {subject.level}
                                </Text>
                              </div>
                            </Group>
                          </UnstyledButton>

                          <Tooltip
                            label={isMember ? 'Remove from collection' : 'Add to collection'}
                          >
                            <ActionIcon
                              variant={isMember ? 'light' : 'filled'}
                              color={isMember ? 'red' : 'primary'}
                              radius="xl"
                              aria-label={
                                isMember
                                  ? `Remove ${subject.slug} from collection`
                                  : `Add ${subject.slug} to collection`
                              }
                              onClick={() => toggleMember(subject.id, isMember)}
                            >
                              {isMember ? <IconMinus size={16} /> : <IconPlus size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        {!isLast && <Divider className="mx-1" c="dimmed" />}
                      </React.Fragment>
                    )
                  })}
                </Paper>
              </Box>
            )
          })}

          {filteredItems.length > showLimit && (
            <Center>
              <Button variant="outline" onClick={() => setShowLimit(value => value + limitStep)}>
                Show more ({filteredItems.length - showLimit} left)
              </Button>
            </Center>
          )}
        </Stack>
      )}

      <Modal
        opened={showLevelSelect}
        onClose={levelSelect.close}
        title="Select levels"
        centered
        zIndex={400}
      >
        <SimpleGrid cols={5} spacing="xs">
          {Array.from({ length: 60 }, (_unused, index) => index + 1).map(level => (
            <Button
              key={level}
              onClick={() => toggleLevel(level)}
              variant={levels.includes(level) ? 'filled' : 'default'}
              size="sm"
              p={0}
              leftSection={levels.includes(level) ? <IconCheck size={12} /> : undefined}
            >
              {level}
            </Button>
          ))}
        </SimpleGrid>
      </Modal>
    </Stack>
  )
}
