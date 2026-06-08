import { Group, Text, Stack, SimpleGrid, Center, Paper, ScrollArea, Switch } from '@mantine/core'
import _ from 'lodash'
import { useSettings } from '../../contexts/SettingsContext'
import { JAPANESE_FONTS } from '../../utils/fonts'

type FontDrawerProps = { isMobile: boolean }

export const FontDrawer = ({ isMobile }: FontDrawerProps) => {
  const { enabledFonts, toggleEnabledFont } = useSettings()

  return (
    <Paper
      p={0}
      shadow="sm"
      className="flex! flex-col! overflow-hidden!"
      onClick={e => e.stopPropagation()}
    >
      <Stack gap="md" className="min-h-0 flex-1">
        <Center>
          <Text size="xs" c="dimmed">
            Select fonts to use for Japanese text. If multiple are selected, they will be used
            randomly.
          </Text>
        </Center>

        <ScrollArea className="min-h-0 flex-1" type="auto" offsetScrollbars>
          <SimpleGrid cols={isMobile ? 1 : 2}>
            {JAPANESE_FONTS.map(font => {
              const isEnabled = enabledFonts.includes(font.name)
              const previewPath = `/assets/fonts/previews/${font.name.replace(/\s+/g, '_').toLowerCase()}.svg`

              return (
                <Group
                  key={font.name}
                  justify="space-between"
                  align="center"
                  className="border p-2 rounded-md cursor-pointer"
                  onClick={e => {
                    toggleEnabledFont(font.name)
                    e.stopPropagation()
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Text fw={500}>{font.name}</Text>
                    {font.name === 'Default' ? (
                      <div className="mt-2">
                        <Text size="xl" className="mt-1">
                          人類社会のすべて
                        </Text>
                        <Text className="mt-1">あ い う え お</Text>
                      </div>
                    ) : (
                      <img
                        src={previewPath}
                        alt={`${font.name} preview`}
                        className="mt-2 h-16 w-auto object-contain dark:invert"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <Switch
                    checked={isEnabled}
                    labelPosition="left"
                    onClick={e => e.stopPropagation()}
                  />
                </Group>
              )
            })}
          </SimpleGrid>
        </ScrollArea>
      </Stack>
    </Paper>
  )
}
