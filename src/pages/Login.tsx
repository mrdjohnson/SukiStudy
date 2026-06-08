import React, { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import {
  TextInput,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Collapse,
  Card,
  LoadingOverlay,
  ActionIcon,
  Box,
  useMatches,
} from '@mantine/core'
import clsx from 'clsx'
import logo from '@/src/assets/apple-touch-icon.png'
import { useNavigate } from 'react-router'
import { useLocalStorage } from '@mantine/hooks'
import { IconInfoCircle } from '@tabler/icons-react'
import { getDefaultBackground } from '../utils/defaultWallpaper'

export const Login = () => {
  const navigate = useNavigate()
  const isMobile = useMatches({
    base: true,
    sm: false,
  })

  const [token, setToken] = useLocalStorage({ key: 'wk_token', defaultValue: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      setToken(token)

      navigate('/')
    } catch (err) {
      setError('Invalid API Token or Network Error')
    } finally {
      setLoading(false)
    }
  }

  const backgroundImage = useMemo(() => {
    const defaultBackground = getDefaultBackground()

    if (!defaultBackground) return undefined

    const url = isMobile ? defaultBackground.portraitUrl : defaultBackground.landscapeUrl

    return `url(${url})`
  }, [isMobile])

  return (
    <Box className="min-h-svh flex items-center justify-center px-4 relative font-sans">
      <Box
        aria-hidden
        className="fixed inset-0 bg-cover bg-top-left bg-no-repeat"
        style={{ backgroundImage }}
      />
      <Box aria-hidden className="fixed inset-0 bg-black/55 backdrop-blur-[1px]" />
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />

      <Card
        py={40}
        shadow="lg"
        radius="lg"
        withBorder
        className={clsx('relative z-10', loading && 'border-blue-500!')}
      >
        <Stack align="center" mb={30}>
          <ActionIcon size={64} radius="xl" color="#ff0000" variant="filled">
            <img src={logo} alt="SukiStudy Logo" />
          </ActionIcon>

          <Title ta="center">SukiStudy</Title>
        </Stack>

        <Paper shadow="none" className="py-4 bg-transparent!">
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
              <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red" mb="md">
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
              leftSection={<IconInfoCircle size={14} />}
            >
              How do I connect?
            </Button>

            <Collapse expanded={showHelp}>
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
    </Box>
  )
}
