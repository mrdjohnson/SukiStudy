import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { GameItem, SubjectType } from '../../types'
import { useAllSubjects } from '../../hooks/useAllSubjects'
import { Icons } from '../../components/Icons'
import { Button } from '../../components/ui/Button'
import { Flashcard } from '../../components/Flashcard'
import { useGames } from '../../hooks/useGames'
import {
  Grid,
  Paper,
  Title,
  Text,
  Slider,
  Checkbox,
  Group,
  Chip,
  Modal,
  SimpleGrid,
  UnstyledButton,
  Stack,
  Box,
  Input,
} from '@mantine/core'
import { useUser } from '../../contexts/UserContext'
import { colorByType } from '../../utils/subject'
import { useSettings } from '../../contexts/SettingsContext'
import _ from 'lodash'

export const CustomGameSetup: React.FC = () => {
  const { user, isGuest } = useUser()
  const { availableSubjects, disabledSubjects } = useSettings()
  const { items: learnedItems, loading } = useAllSubjects(true)

  const [selectedGames, setSelectedGames] = useState<string[]>(['quiz'])
  const [itemCount, setItemCount] = useState(25)
  const [roundCount, setRoundCount] = useState(3)
  const [levels, setLevels] = useState<number[]>([])
  const [types, setTypes] = useState<string[]>(availableSubjects)
  const [manualSelection, setManualSelection] = useState<number[]>([])
  const [isManualMode, setIsManualMode] = useState(false)
  const [previewFlashcard, setPreviewFlashcard] = useState<GameItem | null>(null)
  const [showLevelSelect, setShowLevelSelect] = useState(false)

  const navigate = useNavigate()

  const availableGames = useGames()

  // Initialize levels to current level
  useEffect(() => {
    if (user?.is_guest) return

    if (user && levels.length === 0) {
      const initialLevels = [1]
      let level = 2

      while (level <= user.level) {
        initialLevels.push(level)
        level += 1
      }

      setLevels(initialLevels)
    }
  }, [user])

  const getFilteredItems = () => {
    return learnedItems.filter(item => {
      const type = item.subject.object as string

      // Level Filter
      if (levels.length > 0 && !levels.includes(item.subject.level)) return false

      // Type Filter
      if (!types.includes(type)) return false

      return true
    })
  }

  const filteredPool = getFilteredItems()

  const handleStart = () => {
    let finalItems = []
    if (isManualMode && manualSelection.length > 0) {
      finalItems = filteredPool.filter(i => manualSelection.includes(i.subject.id!))
    } else {
      // Random selection from pool
      finalItems = [...filteredPool].sort(() => 0.5 - Math.random()).slice(0, itemCount)
    }

    if (finalItems.length === 0) return

    navigate('/session/custom/play', {
      state: {
        games: selectedGames,
        items: finalItems,
        roundCount,
      },
    })
  }

  const toggleManualId = (id: number) => {
    setManualSelection(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const toggleLevel = (l: number) => {
    if (levels.includes(l)) {
      if (levels.length > 1) setLevels(prev => prev.filter(x => x !== l))
    } else {
      setLevels(prev => [...prev, l])
    }
  }

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Group mb="xl">
        <Button variant="subtle" onClick={() => navigate('/session/games')}>
          <Icons.ChevronLeft />
        </Button>
        <Title order={2}>Custom Session Setup</Title>
      </Group>

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            {/* Game Selection */}
            <Paper p="md" withBorder radius="md">
              <Group mb="md">
                <Icons.Gamepad2 className="w-5 h-5 text-indigo-600" />
                <Title order={4}>Select Games</Title>
              </Group>

              <Chip.Group multiple value={selectedGames} onChange={setSelectedGames}>
                <Group gap="xs">
                  {availableGames.map(g => (
                    <Chip key={g.id} value={g.id} variant="light" radius="sm">
                      {g.name}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Paper>

            {/* Filters */}
            <Paper p="md" withBorder radius="md">
              <Group mb="md">
                <Icons.Settings className="w-5 h-5 text-indigo-600" />
                <Title order={4}>Filters</Title>
              </Group>

              <Stack gap="md">
                {user && !isGuest && (
                  <>
                    <Box>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => setShowLevelSelect(true)}
                        rightSection={<Icons.ChevronRight size={14} />}
                      >
                        Levels:{' '}
                        {levels.length > 3 ? `${levels.length} selected` : levels.join(', ')}
                      </Button>
                    </Box>
                    <Box>
                      <Input.Label>Subject Types</Input.Label>

                      <Chip.Group multiple value={types} onChange={setTypes}>
                        <Group gap="xs">
                          {_.map(SubjectType, subjectType => {
                            return (
                              <Chip
                                key={subjectType}
                                value={subjectType}
                                variant="outline"
                                color={colorByType[subjectType]}
                                disabled={disabledSubjects.includes(subjectType)}
                              >
                                {_.startCase(subjectType)}
                              </Chip>
                            )
                          })}
                        </Group>
                      </Chip.Group>
                    </Box>
                  </>
                )}

                <Box>
                  <Text size="sm" fw={500} mb="xs">
                    Item Count: {itemCount}
                  </Text>
                  <Slider
                    value={itemCount}
                    onChange={setItemCount}
                    min={5}
                    max={100}
                    step={5}
                    marks={[
                      { value: 25, label: '25' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                    ]}
                    mb="lg"
                  />
                </Box>

                <Box>
                  <Text size="sm" fw={500} mb="xs">
                    Round Count: {roundCount}
                  </Text>
                  <Slider
                    value={roundCount}
                    onChange={setRoundCount}
                    min={1}
                    max={5}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                      { value: 5, label: '5' },
                    ]}
                    mb="lg"
                  />
                </Box>

                <Checkbox
                  label="Select Items Manually"
                  checked={isManualMode}
                  onChange={e => setIsManualMode(e.currentTarget.checked)}
                />
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>

        {/* Item Preview / Selection */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper
            p="md"
            withBorder
            radius="md"
            h={600}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Group justify="space-between" mb="md">
              <Title order={4}>
                {isManualMode
                  ? `Selected (${manualSelection.length})`
                  : `Pool (${filteredPool.length})`}
              </Title>
              {isManualMode && (
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setManualSelection(filteredPool.map(i => i.subject.id!))}
                  >
                    All
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => setManualSelection([])}
                  >
                    Clear
                  </Button>
                </Group>
              )}
            </Group>

            <Box style={{ flex: 1, overflowY: 'auto' }} pr="xs">
              <SimpleGrid cols={5} spacing="xs">
                {filteredPool.map(item => {
                  const isSelected = isManualMode && manualSelection.includes(item.subject.id!)
                  const isKana = item.subject.id! < 0
                  return (
                    <UnstyledButton
                      key={item.subject.id}
                      onClick={() => isManualMode && toggleManualId(item.subject.id!)}
                      onContextMenu={e => {
                        e.preventDefault()
                        if (!isKana) setPreviewFlashcard(item)
                      }}
                      style={theme => ({
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: theme.radius.sm,
                        border: `2px solid ${isManualMode && isSelected ? theme.colors.indigo[6] : theme.colors.gray[2]}`,
                        backgroundColor:
                          isManualMode && isSelected ? theme.colors.indigo[0] : 'transparent',
                        opacity: isManualMode && !isSelected ? 0.5 : 1,
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        color: theme.colors.gray[8],
                      })}
                    >
                      {item.subject.characters || '?'}
                    </UnstyledButton>
                  )
                })}
              </SimpleGrid>
              {filteredPool.length === 0 && (
                <Text c="dimmed" ta="center" mt="xl">
                  No items match filters.
                </Text>
              )}
            </Box>

            <Box pt="md" mt="md" style={{ borderTop: '1px solid #eee' }}>
              <Button
                fullWidth
                size="md"
                onClick={handleStart}
                disabled={
                  selectedGames.length === 0 ||
                  filteredPool.length === 0 ||
                  (isManualMode && manualSelection.length === 0)
                }
              >
                Start Session
              </Button>
              <Text size="xs" c="dimmed" ta="center" mt="xs">
                Right click items to view details
              </Text>
            </Box>
          </Paper>
        </Grid.Col>
      </Grid>

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

      {/* Flashcard Preview Modal */}
      <Modal
        opened={!!previewFlashcard}
        onClose={() => setPreviewFlashcard(null)}
        size="lg"
        centered
        withCloseButton={false}
        padding={0}
        bg="transparent"
        styles={{
          body: { backgroundColor: 'transparent' },
          content: { backgroundColor: 'transparent', boxShadow: 'none' },
        }}
      >
        {previewFlashcard && (
          <Flashcard subject={previewFlashcard.subject} hasPrev={false} hasNext={false} />
        )}
      </Modal>
    </div>
  )
}
