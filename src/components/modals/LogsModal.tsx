import { Stack, Group, Button, ScrollArea, Badge, Code, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import moment from 'moment'
import { Icons } from '../Icons'
import { useRef, useEffect } from 'react'
import { useLogs } from '../../hooks/useLogs'

const LogsModal = () => {
  const { logs, clearLogs } = useLogs()
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView()
    }
  }, [logs])

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm" fw={700} tt="uppercase">
          Logs ({logs.length})
        </Text>
        <Button
          size="xs"
          variant="light"
          color="gray"
          onClick={clearLogs}
          disabled={logs.length === 0}
          leftSection={<Icons.Eraser size={14} />}
        >
          Clear
        </Button>
      </Group>

      <ScrollArea type="auto">
        <Stack gap="xs" p="xs">
          {logs.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              No logs yet
            </Text>
          ) : (
            <>
              {logs.map(log => {
                const getLogColor = () => {
                  switch (log.level) {
                    case 'error':
                      return 'red'
                    case 'warn':
                      return 'yellow'
                    case 'info':
                      return 'blue'
                    case 'debug':
                      return 'gray'
                    default:
                      return 'gray'
                  }
                }

                return (
                  <Stack key={log.id} gap={2}>
                    <Group gap="xs" align="flex-start" wrap="nowrap">
                      <Badge
                        size="xs"
                        color={getLogColor()}
                        variant="light"
                        style={{ minWidth: '50px' }}
                      >
                        {log.level}
                      </Badge>
                      <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                        {moment(log.timestamp).format('HH:mm:ss.SSS')}
                      </Text>
                    </Group>
                    <Code
                      block
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        color: log.level === 'error' ? 'var(--mantine-color-red-7)' : undefined,
                      }}
                    >
                      {log.message}
                    </Code>
                  </Stack>
                )
              })}
              <div ref={logsEndRef} />
            </>
          )}
        </Stack>
      </ScrollArea>

      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm" fw={700} tt="uppercase">
          Logs ({logs.length})
        </Text>

        <Text c="dimmed" size="sm">
          Build Date: {moment(__BUILD_DATE__).format('LLL')}
        </Text>

        <Button
          size="xs"
          variant="light"
          color="gray"
          onClick={clearLogs}
          disabled={logs.length === 0}
          leftSection={<Icons.Eraser size={14} />}
        >
          Clear
        </Button>
      </Group>
    </Stack>
  )
}

export const openLogModal = () => {
  modals.open({
    title: 'Logs',
    size: 'xl',
    children: <LogsModal />,
  })
}
