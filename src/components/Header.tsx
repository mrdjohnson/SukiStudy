import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Icons } from './Icons'
import { useSettings } from '../contexts/SettingsContext'
import { HowToPlayModal } from './HowToPlayModal'
import { SettingsModal } from './modals/SettingsModal'
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ThemeIcon,
  ScrollArea,
  Button,
  Badge,
  ActionIcon,
  Divider,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useGames } from '../hooks/useGames'
import { useUser } from '../contexts/UserContext'

import logo from '@/src/assets/apple-touch-icon.png'
import { IconActivity } from '@tabler/icons-react'
import { openLogModal } from './modals/LogsModal'

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

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding="xs"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />

            <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
              <ActionIcon size="lg" radius="xl" color="#ff0000" variant="filled">
                <img src={logo} />
              </ActionIcon>
              <Text size="xl" fw={700} c="dark">
                SukiStudy
              </Text>
              {isGuest && (
                <Badge color="orange" variant="light">
                  Guest
                </Badge>
              )}
            </Link>
          </Group>

          <Group>
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

            <Group gap="xs">
              {helpSteps && (
                <ThemeIcon
                  variant="light"
                  size="lg"
                  radius="xl"
                  color="indigo"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowHelp(true)}
                >
                  <Icons.Help size={18} />
                </ThemeIcon>
              )}
            </Group>
          </Group>
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
            />

            {availableGames.map(g => (
              <NavLink
                key={g.id}
                label={g.name}
                leftSection={<g.icon className={g.color + ' !bg-transparent'} />}
                onClick={() => {
                  navigate(`/session/games/${g.id}`)
                  if (opened) toggle()
                }}
                active={location.pathname.includes(`/session/games/${g.id}`)}
                className={'hover:!' + g.color}
              />
            ))}
          </NavLink>
        </AppShell.Section>

        <Divider />

        <AppShell.Section pt="md">
          <Group className="flex-nowrap!">
            <Button
              fullWidth
              variant="light"
              onClick={() => {
                setShowSettings(true)
                if (opened) toggle()
              }}
              rightSection={<Icons.Settings size={16} />}
            >
              Settings
            </Button>

            <Button variant="subtle" className="size-9! p-0!" onClick={openLogModal} size="sm">
              <IconActivity size={20} />
            </Button>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      {helpSteps && (
        <HowToPlayModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title={helpSteps[0]?.title ? 'How to Play' : 'Instructions'}
          steps={helpSteps}
        />
      )}

      <SettingsModal opened={showSettings} onClose={() => setShowSettings(false)} />
    </AppShell>
  )
}
