import React, { useMemo, useState } from 'react'
import {
  Modal,
  Switch,
  Group,
  Text,
  Stack,
  Divider,
  RangeSlider,
  Chip,
  Accordion,
  SimpleGrid,
  Title,
  useMatches,
  Button,
  Anchor,
  Center,
  ActionIcon,
} from '@mantine/core'
import { useUser } from '../../contexts/UserContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useGames } from '../../hooks/useGames'
import { colorByType } from '../../utils/subject'
import { SubjectType } from '../../types'
import _ from 'lodash'
import clsx from 'clsx'
import { Icons } from '../Icons'
import moment from 'moment'
import { IconWorld } from '@tabler/icons-react'
import { useNavigate } from 'react-router'

interface SettingsModalProps {
  opened: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ opened, onClose }) => {
  const navigate = useNavigate()

  const {
    soundEnabled,
    toggleSound,
    romanjiEnabled,
    toggleRomanji,
    hiddenGames,
    toggleHiddenGame,
    autoPlayAudio,
    toggleAutoPlayAudio,
    autoConvertTyping,
    toggleAutoConvertTyping,

    hiddenSubjects,
    disabledSubjects,
    toggleHiddenSubject,

    getGameSettings,
    updateGameSettings,
    toggleGameSettingsOverride,

    gameLevelMin,
    setGameLevelMin,
    gameLevelMax,
    setGameLevelMax,
  } = useSettings()

  const [showBuildTime, setShowBuildTime] = useState(false)

  const isMobile = useMatches({
    base: true,
    sm: false,
  })

  const { user, isGuest, logout } = useUser()

  const games = useGames({ includeHidden: true })
  const enabledGames = useMemo(() => {
    return games.filter(game => !hiddenGames.includes(game.id))
  }, [games])

  const overriddenGames = useMemo(() => {
    return _.chain(enabledGames)
      .map(game => (getGameSettings(game.id)?.overrideDefaults ? game.id : undefined))
      .compact()
      .value()
  }, [getGameSettings, enabledGames])

  const renderGameOverrideControls = (gameId: string) => {
    const settings = getGameSettings(gameId)

    const toggleDefaults = () => {
      if (settings.overrideDefaults) {
        updateGameSettings(gameId, { overrideDefaults: false })
      } else {
        updateGameSettings(gameId, { hiddenSubjects: [] })
      }
    }

    return (
      <Stack>
        <Switch
          label="Override Defaults?"
          checked={settings.overrideDefaults}
          onClick={toggleDefaults}
        />

        <SimpleGrid cols={2} spacing="xs">
          {_.map(SubjectType, subjectType => {
            const isHidden = settings.hiddenSubjects?.includes(subjectType)

            return (
              <Chip
                key={subjectType}
                checked={!isHidden}
                variant="outline"
                color={colorByType[subjectType]}
                onChange={() =>
                  updateGameSettings(gameId, {
                    hiddenSubjects: _.xor(settings.hiddenSubjects, [subjectType]),
                  })
                }
                disabled={disabledSubjects.includes(subjectType)}
              >
                {_.startCase(subjectType)}
              </Chip>
            )
          })}
        </SimpleGrid>
      </Stack>
    )
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={2} component="div">
          Settings
        </Title>
      }
      centered
      fullScreen={isMobile}
      size="lg"
    >
      <Stack gap="lg">
        {/* General */}
        <Stack gap="md">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            General
          </Text>
          <Group justify="space-between">
            <div>
              <Text fw={500}>Sound Effects</Text>
              <Text size="xs" c="dimmed">
                Play sounds for correct/incorrect answers
              </Text>
            </div>
            <Switch checked={soundEnabled} onChange={toggleSound} />
          </Group>

          <Group justify="space-between">
            <div>
              <Text fw={500}>Romanji Hints</Text>
              <Text size="xs" c="dimmed">
                Display Romanji in supported games
              </Text>
            </div>
            <Switch checked={romanjiEnabled} onChange={toggleRomanji} />
          </Group>
        </Stack>

        <Divider />

        {/* Global Content Defaults */}
        <Stack gap="md">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            Global Defaults
          </Text>
          <Text size="xs" c="dimmed" mt={-10}>
            These settings apply to all games unless overridden below.
          </Text>

          <SimpleGrid cols={2}>
            {_.map(SubjectType, subjectType => {
              const isHidden = hiddenSubjects.includes(subjectType)

              return (
                <Chip
                  key={subjectType}
                  checked={!isHidden}
                  variant="outline"
                  color={isHidden ? undefined : colorByType[subjectType]}
                  onChange={() => toggleHiddenSubject(subjectType)}
                  hidden={disabledSubjects.includes(subjectType)}
                  disabled={disabledSubjects.includes(subjectType)}
                >
                  {_.startCase(subjectType)}
                </Chip>
              )
            })}
          </SimpleGrid>

          {user && !isGuest && (
            <Stack gap="xs" mt="sm">
              <Text fw={500}>
                Level Range ({gameLevelMin} - {gameLevelMax})
              </Text>

              <RangeSlider
                min={1}
                max={user.subscription.max_level_granted}
                step={1}
                minRange={1}
                value={[gameLevelMin, gameLevelMax]}
                onChange={([min, max]) => {
                  setGameLevelMin(min)
                  setGameLevelMax(max)
                }}
              />
            </Stack>
          )}
        </Stack>

        <Divider />

        {/* Behavior */}
        <Stack gap="md">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            Game Behavior
          </Text>
          <Group justify="space-between">
            <div>
              <Text fw={500}>Auto-play Audio</Text>
              <Text size="xs" c="dimmed">
                For Audio Quiz and Flashcards
              </Text>
            </div>
            <Switch checked={autoPlayAudio} onChange={toggleAutoPlayAudio} />
          </Group>

          <Group justify="space-between">
            <div>
              <Text fw={500}>Auto-convert Typing</Text>
              <Text size="xs" c="dimmed">
                Convert Romanji to Hiragana automatically
              </Text>
            </div>
            <Switch checked={autoConvertTyping} onChange={toggleAutoConvertTyping} />
          </Group>
        </Stack>

        <Divider />

        {/* Game Visibility */}
        <Stack gap="md">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            Visible Games
          </Text>
          <Text size="xs" c="dimmed">
            Unselect games to hide them from the menu
          </Text>
          <Group gap="xs">
            {games.map(g => {
              const isGameHidden = hiddenGames.includes(g.id)
              return (
                <div className={clsx('p-0.5 rounded-sm', g.color, isGameHidden && 'opacity-60')}>
                  <Chip
                    key={g.id}
                    checked={!isGameHidden}
                    onChange={() => toggleHiddenGame(g.id)}
                    variant={isGameHidden ? 'filled' : 'subtle'}
                    color="gray"
                    radius="sm"
                  >
                    {g.name}
                  </Chip>
                </div>
              )
            })}
          </Group>
        </Stack>

        <Divider />

        {/* Advanced Per Game Settings */}
        <Stack gap="xs">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            Advanced Game Settings
          </Text>
          <Accordion variant="contained" radius="md" multiple value={overriddenGames}>
            {games.map(game => {
              const isGameHidden = hiddenGames.includes(game.id)
              return (
                <Accordion.Item key={game.id} value={game.id}>
                  <Accordion.Control
                    icon={<game.icon size={20} />}
                    onClick={() => toggleGameSettingsOverride(game.id)}
                    color="red"
                    disabled={isGameHidden}
                  >
                    <Text size="sm" fw={500}>
                      {game.name}
                    </Text>
                  </Accordion.Control>
                  {!isGameHidden && (
                    <Accordion.Panel>{renderGameOverrideControls(game.id)}</Accordion.Panel>
                  )}
                </Accordion.Item>
              )
            })}
          </Accordion>
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text c="dimmed" size="sm" fw={700} tt="uppercase">
            About
          </Text>

          <Stack>
            {/* Build Info */}
            <Text
              size="xs"
              c="dimmed"
              className="text-center"
              onDoubleClick={() => setShowBuildTime(true)}
            >
              Last updated: {moment(__BUILD_DATE__).format(showBuildTime ? 'LLL' : 'LL')}
            </Text>

            {/* GitHub Link */}
            <Center className="pt-2">
              <Anchor
                href="https://github.com/mrdjohnson/SukiStudy"
                target="_blank"
                rel="noopener noreferrer"
                c="dimmed"
              >
                <ActionIcon radius="xl" p={2} color="black" size="lg">
                  <Icons.GitHub stroke={1.5} />
                </ActionIcon>
              </Anchor>
            </Center>
          </Stack>
        </Stack>

        <Divider />

        <Stack>
          {isGuest && (
            <Button
              component="a"
              href="/login"
              fullWidth
              onClick={() => navigate('/login')}
              leftSection={<IconWorld size={16} />}
            >
              Login to WaniKani
            </Button>
          )}

          <Button
            fullWidth
            variant="light"
            color="red"
            onClick={() => {
              logout()
            }}
            leftSection={<Icons.LogOut size={16} />}
          >
            Logout
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
