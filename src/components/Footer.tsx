import { Container, Anchor, Text, Group } from '@mantine/core'
import { Link } from 'react-router'

export const Footer = ({
  showAbout = true,
  showHome = false,
  showLastUpdated = false,
}: {
  showAbout?: boolean
  showHome?: boolean
  showLastUpdated?: boolean
}) => {
  return (
    <footer className="py-6 mt-auto">
      <Container size="lg" className="text-center text-gray-400 text-sm font-semibold">
        {showLastUpdated && (
          <Text size="xs" c="dimmed" className="text-center" mb="xs">
            Last updated: {__BUILD_DATE__}
          </Text>
        )}

        <p>SukiStudy is a third-party app and not affiliated with WaniKani.</p>

        <Group justify="center" gap="xs" mt="sm">
          <Text size="sm" c="dimmed">
            © Copyright 2026
          </Text>

          {showAbout && (
            <>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Anchor
                component={Link}
                to="/about"
                c="dimmed"
                className="hover:text-indigo-500 transition-colors"
                size="sm"
              >
                About
              </Anchor>
            </>
          )}

          {showHome && (
            <>
              <Text size="sm" c="dimmed">
                •
              </Text>
              <Anchor
                component={Link}
                to="/"
                c="dimmed"
                className="hover:text-indigo-500 transition-colors"
                size="sm"
              >
                Home
              </Anchor>
            </>
          )}
        </Group>
      </Container>
    </footer>
  )
}
