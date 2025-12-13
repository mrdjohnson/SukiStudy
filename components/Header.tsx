import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { Icons } from './Icons'
import { useSettings } from '../contexts/SettingsContext'
import { HowToPlayModal } from './HowToPlayModal'
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ThemeIcon,
  ScrollArea,
  Switch,
  Button,
  Badge,
  ActionIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useGames } from '../hooks/useGames'
import { useUser } from '../contexts/UserContext'

import logo from '/assets/apple-touch-icon.png'

interface HeaderProps {
  children: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ children }) => {
  const [opened, { toggle }] = useDisclosure()
  const { soundEnabled, toggleSound, romanjiEnabled, toggleRomanji, helpSteps } = useSettings()
  const { user, isGuest, logout } = useUser()
  const [showHelp, setShowHelp] = useState(false)
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
            {user && <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />}
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
            {user && (
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
              <ThemeIcon
                variant="light"
                size="lg"
                radius="xl"
                color="gray"
                style={{ cursor: 'pointer' }}
                onClick={toggleSound}
              >
                {soundEnabled ? <Icons.Volume size={18} /> : <Icons.VolumeOff size={18} />}
              </ThemeIcon>

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

        <AppShell.Section pt="md">
          <Text size="xs" fw={500} c="dimmed" mb="sm" tt="uppercase">
            Settings
          </Text>

          <Group justify="space-between" mb="sm">
            <Text size="sm">Game Romanji</Text>
            <Switch checked={romanjiEnabled} onChange={toggleRomanji} />
          </Group>

          <Button
            fullWidth
            variant="light"
            color="red"
            onClick={() => {
              logout()
              if (opened) toggle()
            }}
            leftSection={<Icons.LogOut size={16} />}
          >
            Logout
          </Button>
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
    </AppShell>
  )
}
