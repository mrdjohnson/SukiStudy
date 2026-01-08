import React from 'react'
import { Container, Anchor, Text, Group } from '@mantine/core'
import { Link } from 'react-router' // Using react-router as per previous corrections

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 mt-auto">
      <Container size="lg" className="text-center text-gray-400 text-sm font-semibold">
        <p>SukiStudy is a third-party app and not affiliated with WaniKani.</p>

        <Group justify="center" gap="xs" mt="sm">
          <Text size="sm" c="dimmed">
            © Copyright 2026
          </Text>
          <Text size="sm" c="dimmed">
            •
          </Text>
          <Anchor
            component={Link}
            to="/about"
            c="dimmed"
            className="hover:text-indigo-500 transition-colors"
          >
            About
          </Anchor>
        </Group>
      </Container>
    </footer>
  )
}
