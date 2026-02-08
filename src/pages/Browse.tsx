import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Assignment, GameItem, GameItemStat, SubjectType } from '../types'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { toHiragana } from '../utils/kana'
import { openFlashcardModal } from '../components/modals/FlashcardModal'
import {
  TextInput,
  Group,
  Title,
  Paper,
  Chip,
  Modal,
  SimpleGrid,
  Box,
  Text,
  UnstyledButton,
  Badge,
  Stack,
  Input,
  useMatches,
  Center,
  Divider,
  Container,
  Select,
  Tooltip,
  InputClearButton,
} from '@mantine/core'
import { useUser } from '../contexts/UserContext'
import _ from 'lodash'
import { assignments, subjects } from '../services/db'
import { colorByType } from '../utils/subject'
import { GameItemIcon } from '../components/GameItemIcon'
import { useLocalStorage } from '@mantine/hooks'
import { encounterService } from '../services/encounterService'

type GameItemWithStat = GameItem & {
  stats?: GameItemStat
}

export const Browse: React.FC = () => {
  const { user, isGuest } = useUser()
  const [items, setItems] = useState<GameItemWithStat[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [ignoreLimit, setIgnoreLimit] = useState(false)
  const [sortBy, setSortBy] = useLocalStorage<string | null>({
    key: 'browseSortBy',
    defaultValue: 'default',
  })
  const [levels, setLevels] = useLocalStorage<number[]>({
    key: 'browseLevels',
    defaultValue: [],
  })
  const [onlyLearned, setOnlyLearned] = useState(false)
  const [srsFilter, setSrsFilter] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showLevelSelect, setShowLevelSelect] = useState(false)
  const [types, setTypes] = useLocalStorage<string[]>({
    key: 'browseTypes',
    defaultValue: isGuest
      ? [SubjectType.HIRAGANA, SubjectType.KATAKANA]
      : [SubjectType.KANJI, SubjectType.VOCABULARY, SubjectType.RADICAL],
  })

  const assignmentMapRef = useRef<Record<number, Assignment>>(undefined)
  const itemStatMapRef = useRef<Record<number, GameItemStat>>(undefined)

  const limit = useMatches({
    base: 20,
    sm: 32,
    md: 60,
  })

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        assignmentMapRef.current ||= _.keyBy(assignments.find({}).fetch(), 'subject_id')
        itemStatMapRef.current ||= encounterService.getAllItemStats()

        const assignmentMap = assignmentMapRef.current || {}
        const itemStatMap = itemStatMapRef.current || {}

        const allSubjects = subjects.find({ object: { $in: types } }, { sort: { id: 1 } }).fetch()

        setItems(
          allSubjects.map(s => ({
            subject: s,
            assignment: assignmentMap[s.id],
            stats: itemStatMap[s.id],
          })),
        )
      } catch (err) {
        console.error('Browse Fetch Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, types, isGuest])

  const toggleLevel = (l: number) => {
    if (levels.includes(l)) {
      setLevels(prev => prev.filter(x => x !== l))
    } else {
      setLevels(prev => [...prev, l].sort())
    }
  }

  const getFilteredItems = () => {
    return _.chain(items)
      .filter(item => {
        if (onlyLearned) {
          const stage = item.assignment?.srs_stage
          if (stage === undefined || stage === 0) return false
        }

        if (srsFilter.length > 0) {
          const stage = item.assignment?.srs_stage || 0
          let stageLabel = 'Lesson'
          if (stage > 0 && stage < 5) stageLabel = 'Apprentice'
          else if (stage >= 5 && stage < 7) stageLabel = 'Guru'
          else if (stage === 7) stageLabel = 'Master'
          else if (stage === 8) stageLabel = 'Enlightened'
          else if (stage === 9) stageLabel = 'Burned'

          if (!srsFilter.includes(stageLabel)) return false
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const qKana = toHiragana(q)
          const s = item.subject

          const matchMeaning = s.meanings.some(m => m.meaning.toLowerCase().includes(q))
          const matchReading = s.readings?.some(
            r => r.reading.includes(qKana) || r.reading.includes(q),
          )
          const matchChar = s.characters?.includes(q) || s.characters?.includes(qKana)

          if (!matchMeaning && !matchReading && !matchChar) return false
        }

        if (levels.length > 0 && !levels.includes(item.subject.level)) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          const timeA = a.stats?.lastReviewedAt ? new Date(a.stats.lastReviewedAt).getTime() : 0
          const timeB = b.stats?.lastReviewedAt ? new Date(b.stats.lastReviewedAt).getTime() : 0
          return timeB - timeA
        }
        if (sortBy === 'reviews') {
          return (b.stats?.reviewCount || 0) - (a.stats?.reviewCount || 0)
        }
        if (sortBy === 'score_asc') {
          // If no reviews, push to bottom? Or treat as 0? Let's treat no reviews as neutral or bottom.
          // Maybe push undefined stats to end
          if (!a.stats && !b.stats) return 0
          if (!a.stats) return 1
          if (!b.stats) return -1
          return a.stats.averageScore - b.stats.averageScore
        }
        if (sortBy === 'score_desc') {
          if (!a.stats && !b.stats) return 0
          if (!a.stats) return 1
          if (!b.stats) return -1
          return b.stats.averageScore - a.stats.averageScore
        }
        return 0
      })
      .take(ignoreLimit ? items.length : limit)
      .value()
  }

  const getSRSBadge = (stage?: number) => {
    if (stage === undefined) return null
    let label = 'Lesson'
    let color = 'gray'
    if (stage > 0 && stage < 5) {
      label = 'Appr'
      color = 'pink'
    } else if (stage >= 5 && stage < 7) {
      label = 'Guru'
      color = 'grape'
    } else if (stage === 7) {
      label = 'Mast'
      color = 'blue'
    } else if (stage === 8) {
      label = 'Enli'
      color = 'cyan'
    } else if (stage === 9) {
      label = 'Burn'
      color = 'yellow'
    }

    return (
      <Badge color={color} size="xs" variant="filled">
        {label}
      </Badge>
    )
  }

  const filteredItems = useMemo(() => {
    return getFilteredItems()
  }, [onlyLearned, searchQuery, ignoreLimit, items, levels, sortBy, srsFilter])

  const groups = useMemo(() => {
    return _.groupBy(filteredItems, item => item.subject.object)
  }, [filteredItems])

  const levelsLabel = useMemo(() => {
    if (levels.length === 0) return 'All'
    if (levels.length > 3) return `${levels.length} selected`

    return levels.join(', ')
  }, [levels])

  const SRS_GROUPS = ['Apprentice', 'Guru', 'Master', 'Enlightened', 'Burned']

  if (loading && items.length === 0)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  return (
    <Container size="lg" className="size-full max-w-full">
      {/* Filters Header */}
      <Paper p="md" withBorder radius="md" mb="xl">
        <Group justify="space-between" mb="md">
          <Group>
            <Title order={2}>Browse</Title>
            {user && !isGuest && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowLevelSelect(true)}
                rightSection={<Icons.ChevronRight size={14} />}
              >
                Levels: {levelsLabel}
              </Button>
            )}
          </Group>
        </Group>

        <Stack gap="md">
          <Select
            label="Sort By"
            placeholder="Sort items..."
            data={[
              { value: 'default', label: 'Default (Level/ID)' },
              { value: 'recent', label: 'Recently Reviewed' },
              { value: 'reviews', label: 'Most Reviewed' },
              { value: 'score_asc', label: 'Lowest Score' },
              { value: 'score_desc', label: 'Highest Score' },
            ]}
            value={sortBy}
            onChange={setSortBy}
            allowDeselect={false}
          />

          <TextInput
            label="Search"
            placeholder="Search English, Kana, or Romanji..."
            leftSection={<Icons.Sparkles size={16} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.currentTarget.value)}
            rightSection={
              <InputClearButton onClick={() => setSearchQuery('')} hidden={!searchQuery} />
            }
          />

          {user && (
            <Group gap="xs" className="justify-evenly! sm:justify-start! mt-1">
              <Chip checked={onlyLearned} onChange={setOnlyLearned} variant="outline">
                Learned Only
              </Chip>
              <Divider orientation="vertical" />
              <Chip.Group multiple value={srsFilter} onChange={setSrsFilter}>
                {SRS_GROUPS.map(label => (
                  <Chip key={label} value={label} variant="light">
                    {label}
                  </Chip>
                ))}
              </Chip.Group>
            </Group>
          )}

          <Box>
            <Input.Label>Subject Types</Input.Label>

            <Chip.Group
              multiple
              value={types}
              onChange={types => setTypes(_.intersection(_.values(SubjectType), types))}
            >
              <Group gap="xs" className="justify-evenly! sm:justify-start! mt-1">
                {_.map(SubjectType, subjectType => (
                  <Chip
                    key={subjectType}
                    value={subjectType}
                    variant="outline"
                    color={colorByType[subjectType]}
                  >
                    {_.startCase(subjectType)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Box>
        </Stack>
      </Paper>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Icons.FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No items match your filters.</p>
        </div>
      ) : (
        <Stack gap="xl">
          {types.map(type => {
            const groupItems = groups[type]

            if (!groupItems) return null

            return (
              <Box key={type}>
                <Group justify="space-between" mb="sm">
                  <Title order={3}>{_.startCase(type)}</Title>
                  <Badge variant="light" color="gray">
                    {groupItems.length} items
                  </Badge>
                </Group>
                <Paper withBorder radius="md" className="overflow-hidden">
                  {groupItems.map(({ subject, assignment, stats }, index) => {
                    const isLast = index === groupItems.length - 1

                    return (
                      <React.Fragment key={subject.id}>
                        <UnstyledButton
                          onClick={() => openFlashcardModal([subject], 0)}
                          className="w-full text-left hover:bg-gray-50! dark:hover:bg-gray-800! transition-colors"
                        >
                          <Group className="p-3 md:p-4 flex-nowrap">
                            <GameItemIcon subject={subject} />

                            <div className="flex-1 min-w-0">
                              <Group gap="xs" align="center" mb={4}>
                                <Text fw={700} truncate>
                                  {subject.meanings?.[0]?.meaning}
                                </Text>
                                <Group gap={4}>
                                  {subject.readings
                                    ?.filter(r => r.primary)
                                    .map((r, i) => (
                                      <Badge
                                        key={i}
                                        size="md"
                                        variant="dot"
                                        className="bg-gray-200! dark:bg-gray-700! before:bg-black! dark:before:bg-gray-500!"
                                      >
                                        {r.reading}
                                      </Badge>
                                    ))}
                                </Group>
                              </Group>

                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {subject.meanings
                                  ?.slice(1)
                                  .map(m => m.meaning)
                                  .join(', ')}
                              </Text>
                            </div>

                            <Group gap="xs" wrap="nowrap">
                              {assignment?.srs_stage && getSRSBadge(assignment.srs_stage)}

                              {stats && (
                                <Group gap={6}>
                                  <Tooltip
                                    label={
                                      <Stack gap={2}>
                                        <Text size="xs" fw={700}>
                                          Games:
                                        </Text>
                                        {Object.entries(stats.gameCounts).map(([gameId, count]) => (
                                          <Group key={gameId} justify="space-between" w={100}>
                                            <Text size="xs" className="capitalize">
                                              {gameId}:
                                            </Text>
                                            <Text size="xs">{count}</Text>
                                          </Group>
                                        ))}
                                      </Stack>
                                    }
                                  >
                                    <Badge
                                      variant="light"
                                      color={stats.averageScore >= 80 ? 'green' : 'orange'}
                                      size="sm"
                                    >
                                      {stats.averageScore}%
                                    </Badge>
                                  </Tooltip>
                                </Group>
                              )}
                              <Icons.ChevronRight
                                size={18}
                                className="text-gray-600 dark:text-gray-400"
                              />
                            </Group>
                          </Group>
                        </UnstyledButton>

                        {!isLast && <Divider className="mx-1" c="dimmed" />}
                      </React.Fragment>
                    )
                  })}
                </Paper>
              </Box>
            )
          })}
        </Stack>
      )}

      {!ignoreLimit && items.length > limit && (
        <Center>
          <Button onClick={() => setIgnoreLimit(true)} variant="outline" className="mt-4">
            See All {items.length} items
          </Button>
        </Center>
      )}

      {/* Level Select Modal */}
      <Modal
        opened={showLevelSelect}
        onClose={() => setShowLevelSelect(false)}
        title="Select Levels"
        centered
        scrollAreaComponent={Box}
      >
        <SimpleGrid cols={5} spacing="xs">
          {Array.from({ length: 60 }, (_, i) => i + 1).map(l => (
            <Button
              key={l}
              onClick={() => toggleLevel(l)}
              variant={levels.includes(l) ? 'filled' : 'default'}
              size="sm"
              p={0}
            >
              {l}
            </Button>
          ))}
        </SimpleGrid>
      </Modal>
    </Container>
  )
}
