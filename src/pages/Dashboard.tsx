import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useNetwork } from '@mantine/hooks'
import { useNavigate, useLocation, useMatch } from 'react-router'
import { subjects } from '../core/db'
import { Button } from '../components/ui/Button'
import { ActionIcon, Box, Center, Group, Paper } from '@mantine/core'

import useReactivity from '../hooks/useReactivity'

import { IconCategory2, IconInfoCircle, IconSchool, IconWifiOff } from '@tabler/icons-react'
import { Carousel } from '@mantine/carousel'
import { type Subject } from '../core/types'
import _ from 'lodash'
import { openFlashcardModal } from '../components/modals/FlashcardModal'
import { type EmblaCarouselType } from 'embla-carousel'
import { Sheet } from 'react-modal-sheet'
import Options from './Options'
import clsx from 'clsx'

import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { SubjectHero } from '../components/SubjectHero'
import { useSettings } from '../contexts/SettingsContext'
import { gameItemsToLearn } from '../core/db/gameItems'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const subjectMatch = useMatch('/subjects/:subjectId')
  const subjectId = subjectMatch?.params.subjectId
  const openedSubjectIdRef = useRef<string | null>(null)
  const { online } = useNetwork()
  const location = useLocation()
  const { availableSubjects, dashboardSubjectSource, gameLevelMin, gameLevelMax } = useSettings()

  const [embla, setEmbla] = useState<EmblaCarouselType | null>(null)
  const [optionsOpened, setOptionsOpened] = useState(false)

  const wheelPlugin = useRef(
    WheelGesturesPlugin({
      forceWheelAxis: 'y', // Forces vertical mouse scrolling to move horizontal slides
    }),
  )

  useEffect(() => {
    // close option sheet after redirect
    setTimeout(() => {
      setOptionsOpened(false)
    }, 300)
  }, [location.pathname])

  const dashboardSubjects = useReactivity(() => {
    return _.chain(
      gameItemsToLearn({
        subjectTypes: availableSubjects,
        gameLevelMin,
        gameLevelMax,
        includeKana: true,
      }),
    )
      .sampleSize(20)
      .map('subject')
      .value()
  }, [availableSubjects, gameLevelMin, gameLevelMax])

  const emptyDashboardLabel =
    dashboardSubjectSource === 'assigned'
      ? 'No assignments available'
      : dashboardSubjectSource === 'learned'
        ? 'No learned items'
        : 'No reviews due'

  useEffect(() => {
    if (!subjectId || openedSubjectIdRef.current === subjectId) return

    openedSubjectIdRef.current = subjectId

    void (async () => {
      await subjects.isReady()

      const subject = subjects.findOne({ id: Number(subjectId) })

      navigate('/', { replace: true })

      if (subject) {
        openFlashcardModal([subject])
      }
    })()
  }, [navigate, subjectId])

  return (
    <>
      <div
        className={clsx(
          'w-screen h-svh flex overflow-hidden transition-opacity ease-in-out duration-300',
          optionsOpened && 'opacity-0',
        )}
      >
        {!online && (
          <IconWifiOff
            className="drop-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] absolute top-3 right-3 w-fit! text-white"
            stroke={3}
          />
        )}

        <Group
          gap="sm"
          wrap="nowrap"
          className="justify-between! absolute! z-10 w-full bottom-6 py-0 px-6 pointer-events-none max-w-4xl left-0! right-0! mx-auto!"
        >
          <ActionIcon
            color="gray"
            radius="xl"
            size="input-xl"
            onClick={() => setOptionsOpened(true)}
            className="pointer-events-auto"
          >
            <IconCategory2 />
          </ActionIcon>

          {/* <Button
            color="gray"
            radius="xl"
            className="px-4! flex! max-h-20! h-14!"
            classNames={{ label: 'py-4!' }}
            onClick={() => navigate('/session/review')}
          >
            <Group wrap="nowrap">
              <IconSchool />
              Practice
            </Group>
          </Button> */}

          <ActionIcon
            color="gray"
            radius="xl"
            size="input-xl"
            onClick={() => navigate('/session/review')}
            className="pointer-events-auto"
          >
            <IconSchool />
          </ActionIcon>
          {/* <ActionIcon color="gray" radius="xl" size="input-xl" onClick={() => navigate('/browse')}>
            <IconSearch />
          </ActionIcon> */}
        </Group>

        <Carousel
          slideSize="100%"
          height="100%"
          orientation="vertical"
          withIndicators={false}
          withControls={false}
          emblaOptions={{
            loop: true,
            dragFree: false,
            align: 'center',
          }}
          className="w-full bg-black/10 backdrop-blur-[0.3px] text-white text-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] text-shadow-black"
          getEmblaApi={setEmbla}
          plugins={[wheelPlugin.current]}
        >
          {dashboardSubjects.map((subject, index) => (
            <Slide
              key={subject.id}
              subject={subject}
              onInfoClick={() =>
                openFlashcardModal(dashboardSubjects, index, i => embla?.scrollTo(i))
              }
            />
          ))}

          {dashboardSubjects.length === 0 && (
            <Carousel.Slide>
              <Center className="h-full">
                <Button
                  color="gray"
                  radius="xl"
                  size="lg"
                  onClick={() => navigate('/session/review')}
                >
                  {emptyDashboardLabel}
                </Button>
              </Center>
            </Carousel.Slide>
          )}
        </Carousel>
      </div>

      <Sheet
        isOpen={optionsOpened}
        onClose={() => setOptionsOpened(false)}
        style={{ zIndex: 20 }}
        detent="content"
      >
        <Sheet.Container className="rounded-t-2xl! rounded-b-none! overflow-hidden max-w-3xl! mx-auto! left-0! right-0!">
          <Sheet.Content>
            <Suspense fallback={<div />}>
              <Paper className="rounded-none!">
                <Box className="py-4">
                  <Center>
                    <Sheet.DragIndicator />
                  </Center>
                </Box>

                <Options />
              </Paper>
            </Suspense>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onClick={() => setOptionsOpened(false)} />
      </Sheet>
    </>
  )
}

type SlideProps = {
  subject: Subject
  onInfoClick?: () => void
}

const Slide = ({ subject, onInfoClick }: SlideProps) => {
  return (
    <Carousel.Slide>
      <div className="justify-center h-full flex">
        <Center className=" flex-col gap-6">
          <SubjectHero subject={subject} onClick={onInfoClick} />

          <Group className="mt-20">
            <Button variant="transparent" color="white" size="xl" onClick={onInfoClick}>
              <IconInfoCircle className="drop-shadow-[2px_2px_2px_rgba(0,0,0,0.5)]" size={48} />
            </Button>
          </Group>
        </Center>
      </div>
    </Carousel.Slide>
  )
}
