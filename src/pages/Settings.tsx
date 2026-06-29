import { type ReactNode, useMemo, useTransition } from 'react'
import {
  Switch,
  Group,
  Text,
  Stack,
  Divider,
  RangeSlider,
  Chip,
  Accordion,
  SimpleGrid,
  useMatches,
  Button,
  Anchor,
  Center,
  ActionIcon,
  SegmentedControl,
  Tabs,
  Paper,
} from '@mantine/core'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'
import { useGames } from '../hooks/useGames'
import { colorByType } from '../utils/subject'
import { SubjectType } from '../core/types'
import _ from 'lodash'
import clsx from 'clsx'
import { Icons } from '../components/Icons'
import {
  IconAdjustments,
  IconBell,
  IconCloudDownload,
  IconPalette,
  IconRefresh,
  IconWorld,
} from '@tabler/icons-react'
import { useNavigate, useSearchParams } from 'react-router'
import { syncService } from '../services/syncService'
import { subjects } from '../core/db'
import { flush } from '../utils/flush'
import { Footer } from '../components/Footer'
import { AppearancePanel } from '../components/settings/AppearancePanel'
import { NotificationPanel } from '../components/settings/NotificationPanel'
import { CollectionMultiSelect } from '../components/collections/CollectionMultiSelect'

const settingsTabs = ['general', 'appearance', 'notifications'] as const
type SettingsTab = (typeof settingsTabs)[number]

export const SettingsModal = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedTab = searchParams.get('tab')
  const activeTab = settingsTabs.includes(requestedTab as SettingsTab)
    ? (requestedTab as SettingsTab)
    : 'general'

  const setActiveTab = (value: string | null) => {
    const nextTab = settingsTabs.includes(value as SettingsTab) ? (value as SettingsTab) : 'general'

    const nextParams = new URLSearchParams(searchParams)

    if (nextTab === 'general') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }

    setSearchParams(nextParams, { replace: true })
  }

  const [isResettingKana, startResettingKana] = useTransition()
  const [isResettingSubjects, startResettingSubjects] = useTransition()
  const [isUpdatingWaniKani, startUpdatingWaniKani] = useTransition()

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
    dashboardSubjectSource,
    setDashboardSubjectSource,
    dashboardCollectionIds,
    setDashboardCollectionIds,
    studyCollectionIds,
    setStudyCollectionIds,
    gameSyncEnabled,
    toggleGameSyncEnabled,
    autoUpdatesEnabled,
    toggleAutoUpdatesEnabled,
  } = useSettings()

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

  const resetKanaItems = () => {
    startResettingKana(async () => {
      subjects.removeMany({ isKana: true })

      await flush()

      await syncService.populateKana(true)
    })
  }

  const resetSubjects = () => {
    startResettingSubjects(async () => {
      subjects.removeMany({ isKana: false })

      await flush()

      await syncService.syncSubjects(true)
    })
  }

  const updateWaniKaniItems = () => {
    startUpdatingWaniKani(async () => {
      await syncService.syncWaniKani()
    })
  }

  const tabLabel = (label: string, icon: ReactNode) => (isMobile ? <Center>{icon}</Center> : label)

  return (
    <Tabs
      value={activeTab}
      onChange={setActiveTab}
      keepMounted={false}
      className="w-full min-h-full relative!"
    >
      <Paper className="sticky! top-0! z-10">
        <Group grow>
          <Tabs.Tab value="general" aria-label="General settings">
            {tabLabel('General', <IconAdjustments size={18} />)}
          </Tabs.Tab>
          <Tabs.Tab value="appearance" aria-label="Appearance settings">
            {tabLabel('Appearance', <IconPalette size={18} />)}
          </Tabs.Tab>
          <Tabs.Tab value="notifications" aria-label="Notification settings">
            {tabLabel('Notifications', <IconBell size={18} />)}
          </Tabs.Tab>
        </Group>
      </Paper>

      <div className="pb-2">
        <Tabs.Panel value="general">
          <Stack gap="lg" p="md">
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

              <Group justify="space-between">
                <div>
                  <Text fw={500}>Sync Game Progress</Text>
                  <Text size="xs" c="dimmed">
                    {gameSyncEnabled
                      ? 'Progress will be synced to WaniKani'
                      : 'Progress will not be synced to WaniKani'}
                  </Text>
                </div>
                <Switch
                  checked={gameSyncEnabled}
                  onChange={toggleGameSyncEnabled}
                  disabled={isGuest}
                />
              </Group>
            </Stack>

            <Divider />

            <Stack gap="xs">
              <Text c="dimmed" size="sm" fw={700} tt="uppercase">
                Data
              </Text>

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

              <Button variant="outline" onClick={resetKanaItems} loading={isResettingKana}>
                Reset Kana Items
              </Button>

              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text fw={500}>Auto-update WaniKani Items</Text>
                  <Text size="xs" c="dimmed">
                    {autoUpdatesEnabled
                      ? 'Subjects, assignments, and study materials update automatically'
                      : 'Kana stays available without downloading WaniKani items'}
                  </Text>
                </div>
                <Switch
                  checked={autoUpdatesEnabled}
                  onChange={toggleAutoUpdatesEnabled}
                  disabled={isGuest}
                />
              </Group>

              <Button
                variant="outline"
                onClick={updateWaniKaniItems}
                loading={isUpdatingWaniKani}
                disabled={isGuest}
                leftSection={<IconCloudDownload size={16} />}
              >
                Update WaniKani Items
              </Button>

              <Button
                variant="outline"
                onClick={resetSubjects}
                loading={isResettingSubjects}
                leftSection={<IconRefresh size={16} />}
              >
                Reset Subjects
              </Button>
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

              <Stack gap="xs" mt="sm">
                <Text fw={500}>Dashboard Items</Text>
                <SegmentedControl
                  value={dashboardSubjectSource}
                  onChange={value =>
                    setDashboardSubjectSource(value as typeof dashboardSubjectSource)
                  }
                  data={[
                    { value: 'review', label: 'Reviews' },
                    { value: 'learned', label: 'Learned' },
                    { value: 'assigned', label: 'Assigned' },
                    { value: 'collections', label: 'Collections' },
                  ]}
                />
              </Stack>

              <CollectionMultiSelect
                label="Dashboard Collections"
                description="Limit dashboard items to one or more collections."
                value={dashboardCollectionIds}
                onChange={setDashboardCollectionIds}
              />

              <CollectionMultiSelect
                label="Study Collections"
                description="Limit lessons, reviews, and default game sessions to selected collections."
                value={studyCollectionIds}
                onChange={setStudyCollectionIds}
              />
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
                    <div
                      className={clsx('p-0.5 rounded-sm', g.color, isGameHidden && 'opacity-60')}
                    >
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
                <Text size="xs" c="dimmed" className="text-center">
                  Last updated: {__BUILD_DATE__}
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
        </Tabs.Panel>

        <Tabs.Panel value="appearance">
          <Stack p="md">
            <AppearancePanel isMobile={isMobile} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="notifications">
          <Stack p="md">
            <NotificationPanel />
          </Stack>
        </Tabs.Panel>

        <Footer />
      </div>
    </Tabs>
  )
}
