import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/Icons'
import { useUser } from '../contexts/UserContext'
import { Container, Title, Text, Group, SimpleGrid, ThemeIcon, Paper } from '@mantine/core'
import logo from '@/src/assets/apple-touch-icon.png'
import { IconBadgeTm, IconBadgeTmFilled } from '@tabler/icons-react'

export const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { loginAsGuest } = useUser()

  const handleGuest = () => {
    loginAsGuest()
    navigate('/') // Redirects to Dashboard in Guest Mode
  }

  const features = [
    {
      icon: Icons.Brain,
      title: 'WaniKani Integration',
      desc: 'Seamlessly syncs with your WaniKani progress to prioritize what you need to review.',
    },
    {
      icon: Icons.Gamepad2,
      title: 'Gamified Learning',
      desc: 'Break the monotony of reviews of the usual Typing game with Memory Match, Multi choice quiz and more.',
    },
    {
      icon: Icons.GridDots,
      title: 'Hiragana/Katakana',
      desc: "Don't have a WaniKani account? Try out guest Mode to practice your basic kana without an account.",
    },
    {
      icon: IconBadgeTm,
      title: 'More Data Coming Soon',
      desc: 'More mnemonic sources and custom learning systems to be added in future updates.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <ThemeIcon size="lg" radius="xl" color="#ff0000" variant="filled">
            <img src={logo} />
          </ThemeIcon>
          <Text size="xl" fw={700} c="indigo">
            SukiStudy
          </Text>
        </div>
        <Button variant="ghost" onClick={() => navigate('/login')}>
          Login
        </Button>
      </header>

      <main className="flex-1">
        <Container size="lg" py={60}>
          <div className="text-center mb-16">
            <Title className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Master Japanese <br />
              <span className="text-indigo-600">The Fun Way</span>
            </Title>
            <Text size="xl" c="dimmed" maw={600} mx="auto" mb="xl">
              A playful companion app for WaniKani users.
            </Text>

            <Group justify="center" gap="md">
              <Button
                size="xl"
                onClick={() => navigate('/login')}
                leftSection={<Icons.BookOpen size={20} />}
                className="shadow-xl shadow-indigo-200"
              >
                Connect WaniKani
              </Button>
              <Button size="xl" variant="outline" onClick={handleGuest}>
                Try Guest Mode
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt="sm">
              Guest mode supports Hiragana & Katakana practice only.
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={40} py={40}>
            {features.map((f, i) => (
              <Paper
                key={i}
                p="xl"
                radius="md"
                withBorder
                className="hover:shadow-md transition-shadow"
              >
                <ThemeIcon size={48} radius="md" variant="light" color="indigo" mb="md">
                  <f.icon size={28} />
                </ThemeIcon>
                <Title order={3} mb="sm">
                  {f.title}
                </Title>
                <Text c="dimmed">{f.desc}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </main>

      <footer className="bg-white border-t border-gray-100 py-8">
        <Container size="lg" className="text-center text-gray-400 text-sm">
          <p>SukiStudy is a third-party app and not affiliated with WaniKani.</p>
        </Container>
      </footer>
    </div>
  )
}
