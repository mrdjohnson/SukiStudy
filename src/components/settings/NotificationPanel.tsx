import { useState } from 'react'
import {
  Group,
  Text,
  Stack,
  Button,
  SegmentedControl,
  Paper,
  Chip,
  Select,
  Switch,
} from '@mantine/core'
import { useSettings } from '../../contexts/SettingsContext'
import {
  isPushNotificationSupported,
  savePushNotificationSchedule,
  sendTestPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../../services/pushNotificationService'
import { TimeInput } from '@mantine/dates'
import { useUser } from '../../contexts/UserContext'
import { IconBell } from '@tabler/icons-react'
import { CollectionMultiSelect } from '../collections/CollectionMultiSelect'

const dayOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export const NotificationPanel = () => {
  const {
    notificationSchedule,
    setNotificationSchedule,
    notificationCollectionIds,
    setNotificationCollectionIds,
  } = useSettings()

  const { user } = useUser()

  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)

  const updateNotificationSchedule = (updates: Partial<typeof notificationSchedule>) => {
    setNotificationMessage(null)
    setNotificationSchedule(prev => ({
      ...prev,
      ...updates,
    }))
  }

  const saveNotifications = (enabled = notificationSchedule.enabled) => {
    setIsSavingNotifications(true)

    const userId = user?.id || user?.username || 'guest'

    void (async () => {
      try {
        if (!enabled) {
          await unsubscribeFromPushNotifications()
          setNotificationSchedule(prev => ({ ...prev, enabled: false }))
          setNotificationMessage('Notifications are off.')
          return
        }

        const nextSchedule = { ...notificationSchedule, enabled: true }
        const savedSchedule = notificationSchedule.enabled
          ? await savePushNotificationSchedule(nextSchedule, userId)
          : await subscribeToPushNotifications(nextSchedule, userId)

        setNotificationSchedule(savedSchedule)
        setNotificationMessage('Notification schedule saved.')
      } catch (error) {
        setNotificationMessage(error instanceof Error ? error.message : 'Could not save schedule.')
      } finally {
        setIsSavingNotifications(false)
      }
    })()
  }

  const sendTestNotification = () => {
    setIsSendingTestNotification(true)
    setNotificationMessage(null)

    void (async () => {
      try {
        await sendTestPushNotification()
        setNotificationMessage('Test push sent.')
      } catch (error) {
        setNotificationMessage(
          error instanceof Error ? error.message : 'Could not send test push notification.',
        )
      } finally {
        setIsSendingTestNotification(false)
      }
    })()
  }

  const handleCadenceChange = (value: string) => {
    const currentDay = new Date().getDay()
    const cadence = value as typeof notificationSchedule.cadence
    const existingDays =
      notificationSchedule.cadence === 'daily' ? [currentDay] : notificationSchedule.daysOfWeek

    updateNotificationSchedule({
      cadence,
      daysOfWeek:
        cadence === 'daily'
          ? [0, 1, 2, 3, 4, 5, 6]
          : existingDays.length > 0
            ? [existingDays[0]]
            : [currentDay],
    })
  }

  return (
    <Paper
      p={0}
      shadow="sm"
      className="flex! flex-col! overflow-hidden!"
      onClick={e => e.stopPropagation()}
    >
      {/* Notifications */}
      <Stack gap="md">
        <Text c="dimmed" size="sm" fw={700} tt="uppercase">
          Notifications
        </Text>

        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconBell size={18} />
              <Text fw={500}>Study Reminder</Text>
            </Group>
            <Text size="xs" c="dimmed">
              {notificationSchedule.time} {notificationSchedule.timezone}
            </Text>
          </div>
          <Switch
            checked={notificationSchedule.enabled}
            disabled={!isPushNotificationSupported() || isSavingNotifications}
            onChange={event => saveNotifications(event.currentTarget.checked)}
          />
        </Group>

        <SegmentedControl
          value={notificationSchedule.cadence}
          onChange={handleCadenceChange}
          data={[
            { value: 'daily', label: 'Daily' },
            { value: 'custom', label: 'Certain Days' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />

        {notificationSchedule.cadence === 'custom' && (
          <Chip.Group
            multiple
            value={notificationSchedule.daysOfWeek.map(String)}
            onChange={values =>
              updateNotificationSchedule({ daysOfWeek: values.map(Number).sort() })
            }
          >
            <Group gap="xs">
              {dayOptions.map(day => (
                <Chip key={day.value} value={day.value} variant="outline">
                  {day.label.slice(0, 3)}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}

        {notificationSchedule.cadence === 'weekly' && (
          <Select
            label="Day"
            data={dayOptions}
            value={String(notificationSchedule.daysOfWeek[0] ?? new Date().getDay())}
            onChange={value =>
              updateNotificationSchedule({
                daysOfWeek: [Number(value ?? new Date().getDay())],
              })
            }
            allowDeselect={false}
          />
        )}

        <TimeInput
          label="Time"
          value={notificationSchedule.time}
          onChange={event => updateNotificationSchedule({ time: event.currentTarget.value })}
        />

        <CollectionMultiSelect
          label="Notification Collections"
          description="Limit reminder subjects to selected collections."
          value={notificationCollectionIds}
          onChange={setNotificationCollectionIds}
        />

        <Button
          variant="light"
          onClick={() => saveNotifications(true)}
          loading={isSavingNotifications}
          disabled={!isPushNotificationSupported()}
        >
          Save Schedule
        </Button>

        {import.meta.env.DEV && (
          <Button
            variant="outline"
            onClick={sendTestNotification}
            loading={isSendingTestNotification}
            disabled={!isPushNotificationSupported() || isSavingNotifications}
          >
            Send Test Push
          </Button>
        )}

        {!isPushNotificationSupported() && (
          <Text size="xs" c="red">
            Push notifications are not available in this browser.
          </Text>
        )}

        {notificationMessage && (
          <Text size="xs" c="red">
            {notificationMessage}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
