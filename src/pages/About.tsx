import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  ThemeIcon,
  SimpleGrid,
  Blockquote,
  Button,
  Center,
  Anchor,
} from '@mantine/core'
import { Icons } from '../components/Icons'
import { IconHeart, IconDatabase, IconSchool } from '@tabler/icons-react'
import { useUser } from '../contexts/UserContext'
import { useNavigate } from 'react-router'

export const About = () => {
  const { loginAsGuest } = useUser()

  const navigate = useNavigate()

  const handleGuest = () => {
    loginAsGuest()
    navigate('/') // Redirects to Dashboard in Guest Mode
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="xl">
        {/* Hero Section */}
        <Stack className="text-center! py-4 md:py-6 saturate-200 bg-gradient-to-r from-primary/70 to-secondary/70 rounded-3xl text-white shadow-xl mb-6">
          <Center>
            <ThemeIcon variant="white" size={60} radius="xl" color="primary">
              <IconHeart size={32} />
            </ThemeIcon>
          </Center>

          <a
            className="text-4xl! font-extrabold! tracking-tight! underline underline-offset-4"
            href="/"
          >
            SukiStudy
          </a>

          <Text size="lg" className="opacity-90 font-semibold!">
            Discover the joy of learning Japanese.
          </Text>

          <div>
            <Button onClick={handleGuest} variant="white" color="primary" size="md" radius="xl">
              Start Learning
            </Button>
          </div>
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: 'lg', md: 'md' }}>
          {/* Mission */}
          <Card shadow="sm" padding="lg" radius="md" withBorder className="h-full">
            <Card.Section withBorder inheritPadding py="xs" className="bg-gray-50">
              <Group gap="xs">
                <IconHeart color="#ec4899" />
                <Text fw={600}>Why "Suki"?</Text>
              </Group>
            </Card.Section>

            <Stack mt="md" gap="md">
              <Text>
                In Japanese, <strong>Suki (好き)</strong> means "like" or "fondness".
              </Text>
              <Blockquote
                color="pink"
                cite="— The SukiStudy Philosophy"
                icon={<IconHeart size={20} />}
                mt="xs"
              >
                The most effective learning happens when you truly enjoy what you are doing.
              </Blockquote>
              <Text>
                SukiStudy was created to add more learning and repition options to WaniKani. We
                wanted to make the journey of learning Japanese characters (Kana) and vocabulary
                less repititive and more fun. We aim to transform "studying" into daily, habitual
                games that you look forward to.
              </Text>
            </Stack>
          </Card>

          {/* Data Sources */}
          <Card shadow="sm" padding="lg" radius="md" withBorder className="h-full">
            <Card.Section withBorder inheritPadding py="xs" className="bg-gray-50">
              <Group gap="xs">
                <IconDatabase color="#6366f1" />
                <Text fw={600}>Credits & Data Sources</Text>
              </Group>
            </Card.Section>

            <Stack mt="md" gap="md">
              <Text>
                This application is made possible thanks to the amazing resources provided by the
                Japanese learning community.
              </Text>

              <Stack gap="xs">
                <Card withBorder radius="md" p="sm" className="hover:bg-gray-50 transition-colors">
                  <Group wrap="nowrap">
                    <ThemeIcon variant="light" color="orange" size="lg">
                      <IconSchool size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm">
                        Tofugu
                      </Text>
                      <Text c="dimmed">
                        <Anchor
                          href="https://www.tofugu.com/japanese/learn-hiragana/"
                          target="_blank"
                        >
                          Hiragana
                        </Anchor>{' '}
                        &{' '}
                        <Anchor
                          href="https://www.tofugu.com/japanese/learn-katakana/"
                          target="_blank"
                        >
                          Katakana
                        </Anchor>{' '}
                        mnemonics and audio resources.
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card withBorder radius="md" p="sm" className="hover:bg-gray-50 transition-colors">
                  <Group wrap="nowrap">
                    <ThemeIcon variant="light" color="blue" size="lg">
                      <IconDatabase size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm">
                        WaniKani Community
                      </Text>
                      <Text c="dimmed">
                        <Anchor
                          href="https://community.wanikani.com/t/wk-mnemonic-art-for-kanji-levels-1-7-radical-levels-1-10/47656"
                          target="_blank"
                        >
                          Mnemonic artwork
                        </Anchor>{' '}
                        and{' '}
                        <Anchor href="https://knowledge.wanikani.com/wanikani/srs/" target="_blank">
                          learning structure
                        </Anchor>
                        .
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card withBorder radius="md" p="sm" className="hover:bg-gray-50 transition-colors">
                  <Group wrap="nowrap">
                    <ThemeIcon variant="light" color="gray" size="lg">
                      <Icons.GitHub size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm">
                        Open Source
                      </Text>
                      <Text c="dimmed">
                        Built with React, Mantine, and other great open-source tools.
                      </Text>
                    </div>
                  </Group>
                </Card>
              </Stack>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
