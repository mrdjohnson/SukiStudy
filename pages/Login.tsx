import React, { useState } from 'react'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { waniKaniService } from '../services/wanikaniService'
import { User } from '../types'
import {
  TextInput,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Collapse,
  ThemeIcon,
  Card,
  LoadingOverlay,
  ActionIcon,
} from '@mantine/core'
import clsx from 'clsx'
import logo from '/assets/apple-touch-icon.png'

interface LoginProps {
  onLogin: (token: string, user: User) => void
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [token, setToken] = useState(localStorage.getItem('wk_token') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      waniKaniService.setToken(token)
      const userRes = await waniKaniService.getUser() // Validate token
      onLogin(token, userRes.data)
    } catch (err) {
      setError('Invalid API Token or Network Error')
      waniKaniService.setToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative">
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />

      <Card
        py={40}
        shadow="lg"
        radius="lg"
        withBorder
        className={clsx(loading && '!border-blue-500')}
      >
        <Stack align="center" mb={30}>
          <ActionIcon size={64} radius="xl" color="#ff0000" variant="filled">
            <img src={logo} />
          </ActionIcon>

          <Title ta="center">SukiStudy</Title>
        </Stack>

        <Paper shadow="none" className="py-4">
          <form onSubmit={handleSubmit}>
            <TextInput
              label="API Token"
              placeholder="Ex: 8a4c9b..."
              description="Enter your WaniKani Personal Access Token V2"
              required
              value={token}
              onChange={e => setToken(e.target.value)}
              mb="md"
              size="lg"
            />

            {error && (
              <Alert icon={<Icons.Info size={16} />} title="Error" color="red" mb="md">
                {error}
              </Alert>
            )}

            <Button fullWidth type="submit" size="md">
              Connect Account
            </Button>
          </form>

          <Stack mt="xl" align="center" gap="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowHelp(!showHelp)}
              leftSection={<Icons.Info size={14} />}
            >
              How do I connect?
            </Button>

            <Collapse in={showHelp}>
              <Paper bg="gray.0" p="md" radius="sm">
                <Text size="sm" mb="xs">
                  To use SukiStudy, you need a valid WaniKani account.
                </Text>
                <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-700">
                  <li>Log in to WaniKani.</li>
                  <li>Go to Settings {'>'} API Tokens.</li>
                  <li>Generate a new token with "Default" permissions.</li>
                  <li>Copy and paste it here.</li>
                </ol>
                <Button
                  component="a"
                  href="https://www.wanikani.com/settings/personal_access_tokens"
                  target="_blank"
                  variant="light"
                  fullWidth
                  mt="sm"
                  size="xs"
                >
                  Get Token from WaniKani
                </Button>
              </Paper>
            </Collapse>
          </Stack>
        </Paper>
      </Card>
    </div>
  )
}
