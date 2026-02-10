import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import {
  Container,
  Title,
  Text,
  Group,
  SimpleGrid,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core'
import logo from '@/src/assets/apple-touch-icon.png'
import {
  IconBadgeTm,
  IconBook,
  IconBrain,
  IconDeviceGamepad2,
  IconGridDots,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { Footer } from '../components/Footer'

export const Landing: React.FC = () => {
  const navigate = useNavigate()

  const { colorScheme, setColorScheme } = useMantineColorScheme()

  // Lazy import the user context only when entering guest mode
  // This avoids initializing the DB for users just viewing the landing page
  const handleGuest = async () => {
    localStorage.setItem('wk_token', 'guest_token')
    // We need to trigger login from the App level, so just navigate
    // and let the route handle guest login
    navigate('/?guest=true')
  }

  const features = [
    {
      backgroundType: 'md:bg-gradient-to-br!',
      icon: IconBrain,
      title: 'WaniKani Integration',
      desc: 'Seamlessly syncs with your WaniKani progress to prioritize what you need to review.',
    },
    {
      backgroundType: 'md:bg-gradient-to-bl!',
      icon: IconDeviceGamepad2,
      title: 'Gamified Learning',
      desc: 'Break the monotony of reviews of the usual Typing game with Memory Match, Multi choice quiz and more.',
    },
    {
      backgroundType: 'md:bg-gradient-to-tr!',
      icon: IconGridDots,
      title: 'Hiragana/Katakana',
      desc: "Don't have a WaniKani account? Try out guest Mode to practice your basic kana without an account.",
    },
    {
      backgroundType: 'md:bg-gradient-to-tl!',
      icon: IconBadgeTm,
      title: 'More Data Coming Soon',
      desc: 'More mnemonic sources and custom learning systems to be added in future updates.',
    },
  ]

  useEffect(() => {
    const oldScheme = colorScheme
    setColorScheme('light')

    return () => {
      setColorScheme(oldScheme)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 to-white flex flex-col font-sans">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <ThemeIcon size="lg" radius="xl" color="#ff0000" variant="filled">
            <img src={logo} alt="SukiStudy Logo" />
          </ThemeIcon>
          <Text size="xl" fw={700} c="secondary">
            SukiStudy
          </Text>
        </div>
        <Button variant="ghost" onClick={() => navigate('/login')}>
          Login
        </Button>
      </header>

      <main className="flex-1">
        <Container size="lg" py={30}>
          <div className="text-center mb-16">
            <Title className="text-4xl! md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Mastering Japanese <br />
              <span className="text-secondary/80 text-3xl">The Fun Way</span>
            </Title>
            <Text size="xl" maw={600} mx="auto" mb="xl">
              A playful companion app for WaniKani users.
            </Text>

            <Group justify="center" gap="md">
              <Button
                size="xl"
                onClick={() => navigate('/login')}
                leftSection={<IconBook size={20} />}
                className="shadow-md shadow-primary/50"
              >
                Connect WaniKani
              </Button>
              <Button size="xl" variant="outline" onClick={handleGuest} color="indigo">
                Enter as Guest
              </Button>
            </Group>
            <Text size="xs" mt="sm">
              Guest mode supports Hiragana & Katakana practice only.
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={20} py={20}>
            {features.map((f, i) => (
              <div
                key={i}
                className={clsx(
                  f.backgroundType,
                  'bg-white md:bg-transparent',
                  'p-6 rounded-md shadow-sm text-center',
                  'hover:shadow-md! transition-shadow from-transparent to-white border-slate-200!',
                )}
              >
                <ThemeIcon size={48} radius="md" variant="light" color="primary" mb="md">
                  <f.icon size={28} />
                </ThemeIcon>
                <Title order={3} mb="sm">
                  {f.title}
                </Title>
                <Text c="dimmed">{f.desc}</Text>
              </div>
            ))}
          </SimpleGrid>
        </Container>
      </main>

      <Footer />
    </div>
  )
}
