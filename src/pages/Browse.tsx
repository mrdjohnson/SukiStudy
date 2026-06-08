import React, { useState, useEffect, useMemo, useRef } from 'react'
import { SubjectType } from '../core/types'
import type { Assignment, GameItem, GameItemStat } from '../core/types'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { toHiragana, toRomanji } from '../utils/kana'
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
  useMatches,
  Center,
  Divider,
  Container,
  Tooltip,
  InputClearButton,
  ActionIcon,
  Radio,
} from '@mantine/core'
import { useUser } from '../contexts/UserContext'
import _ from 'lodash'
import { assignments, subjects } from '../core/db'
import { colorByType } from '../utils/subject'
import { GameItemIcon } from '../components/GameItemIcon'
import { useLocalStorage } from '@mantine/hooks'
import { encounterService } from '../services/encounterService'
import { IconAdjustments, IconCheck, IconSearch } from '@tabler/icons-react'
import { Sheet } from 'react-modal-sheet'

type GameItemWithStat = GameItem & {
  stats?: GameItemStat
  romanjis: string[]
  srsStageLabel: string
}

const SRS_GROUPS = ['Apprentice', 'Guru', 'Master', 'Enlightened', 'Burned']

const KanjiByType = {
  [SubjectType.HIRAGANA]: '平仮名',
  [SubjectType.KATAKANA]: '片仮名',
  [SubjectType.RADICAL]: '部首',
  [SubjectType.VOCABULARY]: '語彙',
}

const getStageLabel = (stage?: number) => {
  if (stage === undefined || stage === 0) return 'Lesson'

  if (stage > 0 && stage < 5) return 'Apprentice'
  else if (stage >= 5 && stage < 7) return 'Guru'
  else if (stage === 7) return 'Master'
  else if (stage === 8) return 'Enlightened'

  return 'Burned'
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

  const [optionsOpened, setOptionsOpened] = useState(false)

  const reset = () => {
    setLevels([])
    setOnlyLearned(false)
    setSrsFilter([])
    setSearchQuery('')
    setShowLevelSelect(false)
    setOptionsOpened(false)
    setTypes([])
    setSortBy('default')
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        assignmentMapRef.current ||= _.keyBy(assignments.find({}).fetch(), 'subject_id')
        itemStatMapRef.current ||= encounterService.getAllItemStats()

        const assignmentMap = assignmentMapRef.current || {}
        const itemStatMap = itemStatMapRef.current || {}

        const allSubjects = subjects
          .find({ object: types[0] ? { $in: types } : { $not: undefined } }, { sort: { id: 1 } })
          .fetch()

        setItems(
          _.chain(allSubjects)
            .map(s => ({
              subject: s,
              assignment: assignmentMap[s.id],
              stats: itemStatMap[s.id],
              romanjis: _.map(s.readings, r => toRomanji(r.reading)),
              srsStageLabel: getStageLabel(assignmentMap[s.id]?.srs_stage),
            }))
            .sort((a, b) => {
              if (sortBy === 'recent') {
                const timeA = a.stats?.lastReviewedAt
                  ? new Date(a.stats.lastReviewedAt).getTime()
                  : 0
                const timeB = b.stats?.lastReviewedAt
                  ? new Date(b.stats.lastReviewedAt).getTime()
                  : 0
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
            .value(),
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
    const query = searchQuery.toLowerCase().trim()
    const kanaQuery = toHiragana(query)
    const romanjiQuery = toRomanji(query)

    return _.chain(items)
      .filter(item => {
        if (onlyLearned && item.srsStageLabel === 'Lesson') {
          return false
        }

        if (srsFilter.length > 0 && !srsFilter.includes(item.srsStageLabel)) {
          return false
        }

        if (searchQuery.trim()) {
          const s = item.subject

          const matchMeaning = s.meanings.some(m => m.meaning.toLowerCase().includes(query))
          const matchReading = item.romanjis.some(r => r.includes(romanjiQuery))
          const matchChar = s.characters?.includes(query) || s.characters?.includes(kanaQuery)

          if (!matchMeaning && !matchReading && !matchChar) return false
        }

        if (levels.length > 0 && !levels.includes(item.subject.level)) {
          return false
        }

        return true
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

  const typeGroups = useMemo(() => {
    return types.length === 0
      ? [
          SubjectType.HIRAGANA,
          SubjectType.KATAKANA,
          SubjectType.KANJI,
          SubjectType.VOCABULARY,
          SubjectType.RADICAL,
        ]
      : types
  }, [types])

  if (loading && items.length === 0)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  return (
    <Container size="lg" className="size-full max-w-full px-2! sm:px-2! md:px-4!">
      {/* Filters Header */}
      <Group wrap="nowrap" className="pb-4">
        <TextInput
          radius="xl"
          placeholder="Search English, Kana, or Romanji..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.currentTarget.value)}
          rightSection={
            <InputClearButton onClick={() => setSearchQuery('')} hidden={!searchQuery} />
          }
          className="w-full"
        />

        <ActionIcon variant="subtle" onClick={() => setOptionsOpened(true)} radius="xl">
          <IconAdjustments />
        </ActionIcon>
      </Group>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Icons.FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No items match your filters.</p>
        </div>
      ) : (
        <Stack gap="xl" className="pb-4">
          {typeGroups.map(type => {
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

      {!ignoreLimit && filteredItems.length > limit && (
        <Center>
          <Button onClick={() => setIgnoreLimit(true)} variant="outline" className="mt-4">
            See All {filteredItems.length} items
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
        zIndex={300}
      >
        <SimpleGrid cols={5} spacing="xs" translate="no">
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

      <Sheet isOpen={optionsOpened} onClose={() => setOptionsOpened(false)} style={{ zIndex: 200 }}>
        <Sheet.Container className="rounded-t-2xl! rounded-b-none! overflow-hidden max-h-fit max-w-4xl! mx-auto! left-0! right-0!">
          <Sheet.Content className="relative">
            <Paper className="rounded-none!  md:px-4">
              <Box className="py-4">
                <Center>
                  <Sheet.DragIndicator />
                </Center>
              </Box>

              <Paper pt={0} radius="md" className="p-2">
                <Stack gap="md">
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

                  <Box>
                    <Text className="pb-2!">Subject Type {!types[0] && '(All)'}</Text>

                    <div className="grid grid-cols-2 gap-2">
                      <Radio.Card
                        className="row-span-2 bg-transparent! rounded-xl! p-3 text-start! flex! backdrop-blur-[1px]! h-full bg-linear-to-br from-white/20 to-transparent relative"
                        onClick={() => setTypes(types => _.xor(types, [SubjectType.KANJI]))}
                        checked={types.includes(SubjectType.KANJI)}
                      >
                        <div
                          className="absolute top-0 w-full h-full text-6xl opacity-5 flex justify-center text-shadow-lg text-shadow-white text-black blur-[2px]"
                          translate="no"
                        >
                          <Center>漢字</Center>
                        </div>

                        <span className="p-2 font-semibold text-xl">Kanji</span>
                        <div className="absolute bottom-3 right-3">
                          <Radio.Indicator
                            icon={IconCheck}
                            variant="outline"
                            color={colorByType[SubjectType.KANJI]}
                            className="bg-transparent!"
                          />
                        </div>
                      </Radio.Card>

                      {_.map(SubjectType, subjectType => {
                        if (subjectType === SubjectType.KANJI) return null
                        return (
                          <Radio.Card
                            className=" bg-black/30! rounded-xl! relative px-3! text-start! flex! py-3! overflow-hidden"
                            onClick={() => setTypes(types => _.xor(types, [subjectType]))}
                            checked={types.includes(subjectType)}
                          >
                            <div
                              className="absolute -top-2 left-0 w-full h-full text-6xl text-black/60 text-shadow-white/20 text-shadow-sm opacity-20 text-center"
                              translate="no"
                            >
                              {KanjiByType[subjectType]}
                            </div>
                            <Group className="justify-between! w-full">
                              <span className="font-semibold font-lg">
                                {_.startCase(subjectType)}
                              </span>

                              <Radio.Indicator
                                icon={IconCheck}
                                variant="outline"
                                color={colorByType[subjectType]}
                                className="bg-transparent!"
                              />
                            </Group>
                          </Radio.Card>
                        )
                      })}
                    </div>
                  </Box>

                  <Box>
                    <Text className="pb-2!">Sort Order</Text>

                    <Radio.Group
                      onChange={setSortBy}
                      value={sortBy}
                      className="rounded-xl bg-black/60 p-2 px-8 relative overflow-hidden bg-linear-to-br to-white/20 from-transparent via-transparent via-80%"
                      size="lg"
                    >
                      <div className="absolute -top-4 -left-8 w-24 h-24 bg-white/20 blur-2xl rounded-full group-hover:bg-white/30 transition-all"></div>

                      <Stack className="py-2">
                        <div onClick={() => setSortBy('default')}>
                          <Radio
                            classNames={{ body: 'justify-between! items-center' }}
                            labelPosition="left"
                            value="default"
                            label="Default"
                          />
                        </div>

                        <div onClick={() => setSortBy('recent')}>
                          <Radio
                            classNames={{ body: 'justify-between! items-center' }}
                            labelPosition="left"
                            value="recent"
                            label="Recently Reviewed"
                          />
                        </div>

                        <div onClick={() => setSortBy('reviews')}>
                          <Radio
                            classNames={{ body: 'justify-between! items-center' }}
                            labelPosition="left"
                            value="reviews"
                            label="Most Reviewed"
                          />
                        </div>

                        <div onClick={() => setSortBy('score_asc')}>
                          <Radio
                            classNames={{ body: 'justify-between! items-center' }}
                            labelPosition="left"
                            value="score_asc"
                            label="Lowest Score"
                          />
                        </div>

                        <div onClick={() => setSortBy('score_desc')}>
                          <Radio
                            classNames={{ body: 'justify-between! items-center' }}
                            labelPosition="left"
                            value="score_desc"
                            label="Highest Score"
                          />
                        </div>
                      </Stack>
                    </Radio.Group>
                  </Box>

                  <Box>
                    <Text className="pb-2!">Proficiency</Text>

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
                  </Box>
                </Stack>
              </Paper>

              <Paper className="z-10 sticky bottom-0 w-full pt-2 max-w-2xl mx-auto">
                <Group className="p-2 px-8 justify-between!">
                  <Button size="lg" variant="outline" onClick={reset} radius="lg">
                    Reset
                  </Button>

                  <Button size="lg" onClick={() => setOptionsOpened(false)} radius="lg">
                    Close
                  </Button>
                </Group>
              </Paper>
            </Paper>
          </Sheet.Content>
        </Sheet.Container>

        <Sheet.Backdrop
          onClick={() => setOptionsOpened(false)}
          className=" backdrop-blur-xs bg-black/30"
        />
      </Sheet>
    </Container>
  )
}

// export const Browse = () => {
//   const navigate = useNavigate()
//   const [opened, { open, close }] = useDisclosure(false)

//   const isMobile = useMatches({
//     base: true,
//     sm: false,
//   })

//   useEffect(() => {
//     open()
//   }, [])

//   if (isMobile) {
//     openModal({
//       id: 'browse',
//       fullScreen: isMobile,
//       children: <BrowseContent />,
//     })

//     return
//   }

//   return <BrowseContent />
// }
