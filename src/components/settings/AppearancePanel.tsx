import { useMemo, useState } from 'react'
import {
  Group,
  Text,
  Stack,
  SimpleGrid,
  Button,
  Anchor,
  Center,
  SegmentedControl,
  Image,
  Paper,
  ScrollArea,
  CloseButton,
  AspectRatio,
  Divider,
  useMantineColorScheme,
} from '@mantine/core'
import _ from 'lodash'
import wallpapersData from '../../data/wallpapers.json'
import { useSettings } from '../../contexts/SettingsContext'
import { useDisclosure } from '@mantine/hooks'
import { IconChevronDown, IconChevronRight, IconDeviceDesktop } from '@tabler/icons-react'
import type { Theme } from '../../core/types'
import { Icons } from '../Icons'
import { FontDrawer } from '../modals/FontDrawer'

type ThemeCategoryId = 'seasons' | 'books' | 'anime' | 'chill' | 'random'

interface WallpaperItem {
  id: string
  thumbUrl: string
  imageUrl: string
  alt: string | null
  authorName: string
  authorUrl: string
  unsplashUrl: string
}

export interface WallpaperCategory {
  id: ThemeCategoryId
  label: string
  query: string
  portraitItems: WallpaperItem[]
  landscapeItems: WallpaperItem[]
}

const wallpaperCategories = wallpapersData.categories as WallpaperCategory[]

type ThemePanelProps = { isMobile: boolean }

export const AppearancePanel = ({ isMobile }: ThemePanelProps) => {
  const { themeBackground, setThemeBackground, enabledFonts } = useSettings()

  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const [fontDrawerOpened, { open: openFontDrawer, close: closeFontDrawer }] = useDisclosure(false)

  const [activeThemeCategory, setActiveThemeCategory] = useState<ThemeCategoryId>('seasons')

  const activeThemeItems = useMemo(() => {
    const category = wallpaperCategories.find(item => item.id === activeThemeCategory)
    if (!category) return []
    return isMobile ? category.portraitItems : category.landscapeItems
  }, [activeThemeCategory, isMobile])

  const selectThemeImage = (photo: WallpaperItem) => {
    const nextPortraitUrl = isMobile
      ? photo.imageUrl
      : themeBackground?.portraitUrl || photo.imageUrl
    const nextLandscapeUrl = isMobile
      ? themeBackground?.landscapeUrl || photo.imageUrl
      : photo.imageUrl

    setThemeBackground({
      ...photo,
      id: photo.id,
      portraitUrl: nextPortraitUrl,
      landscapeUrl: nextLandscapeUrl,
    })
  }

  return (
    <Paper
      p={0}
      shadow="sm"
      className="flex! flex-col! overflow-hidden!"
      onClick={e => e.stopPropagation()}
    >
      <Stack gap="md" className="rounded-lg border p-2 border-gray-700 mb-4">
        <SegmentedControl
          value={colorScheme}
          onChange={value => setColorScheme(value as Theme)}
          data={[
            {
              value: 'light',
              label: (
                <Center style={{ gap: 10 }}>
                  <Icons.Sun size={16} />
                  <span>Light</span>
                </Center>
              ),
            },
            {
              value: 'dark',
              label: (
                <Center style={{ gap: 10 }}>
                  <Icons.Moon size={16} />
                  <span>Dark</span>
                </Center>
              ),
            },
            {
              value: 'auto',
              label: (
                <Center style={{ gap: 10 }}>
                  <IconDeviceDesktop size={16} />
                  <span>System</span>
                </Center>
              ),
            },
          ]}
        />

        <Divider className="-mx-2 border-gray-700!" />

        <Button
          variant="transparent"
          fullWidth
          classNames={{ label: 'w-full!' }}
          onClick={fontDrawerOpened ? closeFontDrawer : openFontDrawer}
          rightSection={
            fontDrawerOpened ? <IconChevronDown color="gray" /> : <IconChevronRight color="gray" />
          }
          className="-mt-2"
          color="gray"
        >
          <Group wrap="nowrap" className="justify-between! w-full">
            Font Style
            <div className="font-medium!">{enabledFonts.length} selected</div>
          </Group>
        </Button>

        {fontDrawerOpened && <FontDrawer isMobile={isMobile} />}
      </Stack>

      <Stack gap="md" className="min-h-0 flex-1">
        <Center>
          <Text size="xs" c="dimmed">
            {isMobile ? 'Portrait' : 'Landscape'} images for this device. Pick one for your
            background.
          </Text>
        </Center>

        <SegmentedControl
          value={activeThemeCategory}
          onChange={value => setActiveThemeCategory(value as ThemeCategoryId)}
          data={wallpaperCategories.map(category => ({
            value: category.id,
            label: category.label,
          }))}
        />

        {themeBackground && (
          <Paper withBorder p="sm" radius="md">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <Group wrap="nowrap" gap="xs">
                <AspectRatio>
                  <Image
                    src={themeBackground.thumbUrl}
                    alt=""
                    radius="sm"
                    fit="contain"
                    className="max-h-24"
                  />
                </AspectRatio>
                <Stack gap={2}>
                  <Text fw={500} size="sm">
                    {themeBackground.alt || 'Background'}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    by{' '}
                    <Anchor href={themeBackground.authorUrl} target="_blank" rel="noreferrer">
                      {themeBackground.authorName}
                    </Anchor>{' '}
                    on Unsplash
                  </Text>
                </Stack>
              </Group>

              <CloseButton
                variant="subtle"
                size={isMobile ? 'xs' : 'md'}
                onClick={() => setThemeBackground(null)}
              />
            </Group>
          </Paper>
        )}

        <ScrollArea className="min-h-0 flex-1" type="auto" offsetScrollbars>
          <SimpleGrid cols={3} spacing="xs" pb="xs">
            {activeThemeItems.map(photo => {
              const selectedUrl = isMobile
                ? themeBackground?.portraitUrl
                : themeBackground?.landscapeUrl

              const selected = selectedUrl === photo.imageUrl

              return (
                <Button
                  key={photo.id}
                  p={0}
                  variant={selected ? 'filled' : 'subtle'}
                  onClick={() => selectThemeImage(photo)}
                  className="h-auto! overflow-hidden"
                >
                  <AspectRatio className="h-35">
                    <Image
                      src={photo.thumbUrl}
                      alt={photo.alt || 'Wallpaper option'}
                      fit="contain"
                      h="100%"
                    />
                  </AspectRatio>
                </Button>
              )
            })}
          </SimpleGrid>
        </ScrollArea>

        {activeThemeItems.length === 0 && (
          <Text size="sm" c="dimmed">
            No wallpapers in this category. Run <code>yarn generate-wallpapers</code> to refresh
            data.
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
