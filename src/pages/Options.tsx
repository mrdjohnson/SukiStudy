import { useNavigate } from 'react-router'
import { Icons } from '../components/Icons'
import { openLogModal } from '../components/modals/LogsModal'

import {
  Group,
  Button,
  Divider,
  Stack,
  useMatches,
  Center,
  BackgroundImage,
  SimpleGrid,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core'

import {
  IconBell,
  IconBook,
  IconChartBar,
  IconDeviceGamepad2Filled,
  IconFolder,
  IconPalette,
  IconPlayerPlay,
  IconRoad,
  IconWorld,
} from '@tabler/icons-react'
import { useUser } from '../contexts/UserContext'
import { useSettings } from '../contexts/SettingsContext'
import clsx from 'clsx'

const Options = () => {
  const navigate = useNavigate()
  const { isGuest } = useUser()

  const { themeBackground } = useSettings()

  const isMobile = useMatches({
    base: true,
    sm: false,
  })

  const { colorScheme } = useMantineColorScheme()

  const backgroundUrl = themeBackground
    ? isMobile
      ? themeBackground.portraitUrl
      : themeBackground.landscapeUrl
    : ''

  const actionColor = colorScheme === 'dark' ? 'white' : 'black'
  const collectionNodes = [
    { character: '好', className: 'left-[5%] top-[10%] text-lg rotate-10' },
    { character: '学', className: 'right-[5%] bottom-[10%] text-lg rotate-10' },
    { character: '仮', className: 'left-[5%] bottom-[10%] text-lg -rotate-10' },
    { character: '漢', className: 'right-[5%] top-[10%] text-lg -rotate-10' },

    { character: '語', className: 'left-[18%] my-auto! relative! text-lg hidden md:block' },
    { character: '記', className: 'left-[72%] my-auto! relative! text-lg hidden md:block' },
  ]

  return (
    <Stack className="px-4 pb-8 bg-default pt-4" gap="lg">
      <Group
        className={clsx('justify-evenly!', import.meta.env.DEV && 'cursor-help')}
        onDoubleClick={() => {
          openLogModal()
        }}
      >
        <ActionIcon
          className="rounded-full!"
          variant="transparent"
          color={actionColor}
          onClick={() => navigate('/settings?tab=notifications')}
        >
          <IconBell />
        </ActionIcon>

        <ActionIcon
          className="rounded-full!"
          variant="transparent"
          color={actionColor}
          onClick={() => {
            navigate('/settings')
          }}
        >
          <Icons.Settings />
        </ActionIcon>

        <ActionIcon
          className="rounded-full!"
          variant="transparent"
          color={actionColor}
          onClick={() => navigate('/landing#about')}
        >
          <IconRoad />
        </ActionIcon>
      </Group>

      <SimpleGrid cols={2}>
        <Button
          variant="default"
          className=" bg-slate-500 rounded-xl! h-28! relative group backdrop-blur-sm"
        >
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-primary/20 blur-2xl rounded-full group-hover:bg-white/30 transition-all"></div>
          <Stack>
            <Center>
              <IconPlayerPlay />
            </Center>
            <Center>Start Lesson</Center>
          </Stack>
        </Button>

        <Button
          variant="default"
          className=" bg-slate-600 rounded-xl! h-28! border-dotted! border-blue-700! border-2! relative backdrop-blur-xs"
          onClick={() => navigate('/browse')}
        >
          <div className="absolute bottom-0 -right-8 w-20 h-20 bg-secondary/20 blur-2xl rounded-full group-hover:bg-white/30 transition-all"></div>

          <Stack>
            <Center>
              <IconBook />
            </Center>
            <Center>Browse</Center>
          </Stack>
        </Button>
      </SimpleGrid>

      {/* <div>
        <div className="font-serif! text-2xl font-semibold pb-2">Updates</div>
        <DashboardMessageCarousel />
      </div> */}

      <SimpleGrid cols={2}>
        <Button
          variant="default"
          className="bg-slate-600 rounded-xl! h-20!"
          onClick={() => navigate('/stats')}
        >
          <Stack gap="5px">
            <Center>
              <IconChartBar />
            </Center>

            <Center>Stats</Center>
          </Stack>
        </Button>

        <Button
          variant="default"
          className="rounded-xl! h-20!  p-0! backdrop-blur-xs! bg-transparent! group"
          onClick={() => navigate('/settings?tab=appearance')}
          classNames={{ label: 'w-full' }}
        >
          <BackgroundImage
            src={backgroundUrl}
            className="rounded-xl! overflow-x-hidden w-full!  text-white text-shadow-md text-shadow-black!"
          >
            <Stack
              gap="5px"
              className="m-6 group-hover:scale-105 transition-transform ease-in-out duration-300"
            >
              <Center>
                <IconPalette className="drop-shadow-md drop-shadow-black" />
              </Center>

              <Center>Appearance</Center>
            </Stack>
          </BackgroundImage>
        </Button>
      </SimpleGrid>

      <SimpleGrid cols={2}>
        <Button
          variant="default"
          className="rounded-xl! bg-slate-600 h-20! p-0! backdrop-blur-xs! relative overflow-hidden"
          color="white"
          radius="md"
          size="lg"
          onClick={() => navigate('/session/games')}
        >
          <div className="absolute top-0 bottom-0 -right-10 text-end">
            <IconDeviceGamepad2Filled
              size={80}
              className="text-black/20 drop-shadow-md drop-shadow-primary/50"
            />
          </div>
          <div className="absolute top-0 bottom-0 -left-10 text-end">
            <IconDeviceGamepad2Filled
              size={80}
              className="text-black/20 drop-shadow-md drop-shadow-primary/50"
            />
          </div>
          Games
        </Button>

        <Button
          variant="default"
          className="rounded-xl! bg-slate-600 h-20! p-0! backdrop-blur-xs! relative overflow-hidden"
          color="white"
          radius="md"
          size="lg"
          onClick={() => navigate('/collections')}
        >
          <div
            className="absolute inset-0 text-white/20 dark:text-white/15 flex"
            aria-hidden
            translate="no"
          >
            {collectionNodes.map(node => (
              <span
                key={node.character}
                className={clsx('absolute font-bold leading-none', node.className)}
              >
                {node.character}
              </span>
            ))}
          </div>

          <Stack gap="5px" className="relative z-10">
            <Center>
              <IconFolder />
            </Center>

            <Center>Collections</Center>
          </Stack>
        </Button>
      </SimpleGrid>

      {isGuest && (
        <>
          <Divider className="my-2" />

          <Button
            component="a"
            href="/login"
            fullWidth
            onClick={() => navigate('/login')}
            leftSection={<IconWorld size={16} />}
            variant="default"
            className="rounded-xl! bg-slate-600 h-16!  p-0! backdrop-blur-xs!"
          >
            Login to WaniKani
          </Button>
        </>
      )}
    </Stack>
  )
}

export default Options
