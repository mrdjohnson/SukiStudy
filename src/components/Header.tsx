import React, { Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Icons } from './Icons'
import { useSettings } from '../contexts/SettingsContext'
import { HowToPlayModal } from './HowToPlayModal'

const SettingsModal = React.lazy(() =>
  import('./modals/SettingsModal').then(m => ({ default: m.SettingsModal })),
)
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ThemeIcon,
  ScrollArea,
  Button,
  ActionIcon,
  Divider,
  Stack,
  SimpleGrid,
  useMatches,
  SegmentedControl,
  Center,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useGames } from '../hooks/useGames'
import { useUser } from '../contexts/UserContext'

import logo from '@/src/assets/apple-touch-icon.png'
import { openLogModal } from './modals/LogsModal'
import { useDoubleMouseDown } from '../hooks/useDoubleMouseDown'
import { IconDeviceDesktop } from '@tabler/icons-react'
import type { Theme } from '../types'

interface HeaderProps {
  children: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ children }) => {
  const [opened, { toggle }] = useDisclosure()
  const { helpSteps } = useSettings()
  const { user, isGuest } = useUser()
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const availableGames = useGames()

  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const logoSize = useMatches({
    base: 'md',
    xs: 'lg',
  })

  const themeTextVisibility = useMatches({
    base: 'hidden',
    xs: 'visible',
    sm: 'visible',
    md: 'hidden',
  })

  const handleDoubleMouseDown = useDoubleMouseDown(() => {
    openLogModal()
  })

  // Handle /settings route
  useEffect(() => {
    if (location.pathname === '/settings') {
      setShowSettings(true)
      navigate('/', { replace: true })
    }
  }, [location.pathname, navigate])

  return (
    <AppShell
      header={{ height: { base: 40, xs: 60 } }}
      navbar={{
        width: 300,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding="xs"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" className="flex-nowrap!" gap={0}>
          <Group visibleFrom="md" className="min-w-[284px]" />

          <SimpleGrid cols={3} className="w-full">
            <Group>
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="md"
                size="md"
                classNames={{
                  burger:
                    'dark:[&[data-opened]]:bg-transparent! dark:bg-white/70! dark:[&::before,&::after]:bg-white/70!',
                }}
              />
            </Group>

            <Group className="justify-center! flex-nowrap!" onMouseDown={handleDoubleMouseDown}>
              <Link to="/" className="flex items-center gap-2">
                <ActionIcon size={logoSize} radius="xl" color="#ff0000" variant="filled">
                  <img src={logo} alt="SukiStudy Logo" />
                </ActionIcon>

                <Text size="xl" fw={700}>
                  SukiStudy
                </Text>
              </Link>
            </Group>

            <Group gap="sm" justify="flex-end">
              {user && !isGuest && (
                <Group visibleFrom="sm" gap="xs">
                  <Text size="sm" fw={500} c="dimmed">
                    Level {user.level}
                  </Text>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <Text size="sm" fw={600} c="indigo">
                    {user.username}
                  </Text>
                </Group>
              )}

              {helpSteps && (
                <ThemeIcon
                  variant="light"
                  size={logoSize}
                  radius="xl"
                  color="indigo"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowHelp(true)}
                >
                  <Icons.Help size={18} />
                </ThemeIcon>
              )}
            </Group>
          </SimpleGrid>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <NavLink
            label="Dashboard"
            leftSection={<Icons.Home size="1rem" />}
            onClick={() => {
              navigate('/')
              if (opened) toggle()
            }}
            active={location.pathname === '/'}
          />

          <NavLink
            label="Browse"
            leftSection={<Icons.BookOpen size="1rem" />}
            onClick={() => {
              navigate('/browse')
              if (opened) toggle()
            }}
            active={location.pathname.includes('browse')}
          />

          <NavLink
            label="Games"
            leftSection={<Icons.Gamepad2 size="1rem" />}
            childrenOffset={28}
            onClick={() => {
              navigate('/session/games')
              if (opened) toggle()
            }}
            active={location.pathname.endsWith('games')}
            opened
          >
            <NavLink
              label="Custom Session"
              onClick={() => {
                navigate('/session/custom')
                if (opened) toggle()
              }}
              leftSection={<Icons.Adjustments />}
              active={location.pathname.includes(`/session/custom`)}
            />

            {availableGames.map(g => (
              <NavLink
                key={g.id}
                label={g.name}
                leftSection={<g.icon className={g.color + ' bg-transparent!'} />}
                onClick={() => {
                  navigate(`/session/games/${g.id}`)
                  if (opened) toggle()
                }}
                active={location.pathname.includes(`/session/games/${g.id}`)}
                className={'hover:!' + g.color}
              />
            ))}
          </NavLink>

          <NavLink
            label="Stats"
            leftSection={<Icons.Activity size="1rem" />}
            onClick={() => {
              navigate('/stats')
              if (opened) toggle()
            }}
            active={location.pathname === '/stats'}
          />
        </AppShell.Section>

        <Divider />

        <AppShell.Section pt="md">
          <Stack>
            <Group className="flex-nowrap!">
              <Button
                fullWidth
                variant="subtle"
                onClick={() => {
                  navigate('/about')
                  if (opened) toggle()
                }}
                color="indigo"
                classNames={{ inner: 'min-w-8 place-self-center' }}
              >
                <Icons.Info />
              </Button>

              <SegmentedControl
                value={colorScheme}
                onChange={value => setColorScheme(value as Theme)}
                data={[
                  {
                    value: 'light',
                    label: (
                      <Center style={{ gap: 10 }}>
                        <Icons.Sun />
                        <Text className={themeTextVisibility}>Light</Text>
                      </Center>
                    ),
                  },
                  {
                    value: 'dark',
                    label: (
                      <Center style={{ gap: 10 }}>
                        <Icons.Moon />
                        <Text className={themeTextVisibility}>Dark</Text>
                      </Center>
                    ),
                  },
                  {
                    value: 'auto',
                    label: (
                      <Center style={{ gap: 10 }}>
                        <IconDeviceDesktop />
                        <Text className={themeTextVisibility}>System</Text>
                      </Center>
                    ),
                  },
                ]}
                className="w-fit! shrink-0"
              />

              <Button
                fullWidth
                variant="subtle"
                component="a"
                href="https://github.com/mrdjohnson/SukiStudy"
                color="indigo"
                classNames={{ inner: 'min-w-8 place-self-center' }}
              >
                <Icons.GitHub />
              </Button>
            </Group>

            <Button
              fullWidth
              variant="light"
              onClick={() => {
                setShowSettings(true)
                if (opened) toggle()
              }}
              rightSection={<Icons.Settings size={16} />}
              color="indigo"
            >
              Settings
            </Button>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="flex! flex-col">{children}</AppShell.Main>

      {helpSteps && (
        <HowToPlayModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title={helpSteps[0]?.title ? 'How to Play' : 'Instructions'}
          steps={helpSteps}
        />
      )}

      <Suspense fallback={null}>
        <SettingsModal opened={showSettings} onClose={() => setShowSettings(false)} />
      </Suspense>
    </AppShell>
  )
}
