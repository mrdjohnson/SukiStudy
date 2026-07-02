import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useNetwork } from '@mantine/hooks'
import { useNavigate, useLocation, useMatch } from 'react-router'
import { subjects } from '../core/db'
import { Button } from '../components/ui/Button'
import { ActionIcon, Box, Center, Group, Paper } from '@mantine/core'

import useReactivity from '../hooks/useReactivity'

import {
  IconBookmarkPlus,
  IconCategory2,
  IconInfoCircle,
  IconSchool,
  IconWifiOff,
} from '@tabler/icons-react'
import { Carousel } from '@mantine/carousel'
import { type GameItem, type Subject } from '../core/types'
import _ from 'lodash'
import { openFlashcardModal } from '../components/modals/FlashcardModal'
import { type EmblaCarouselType } from 'embla-carousel'
import { Sheet } from 'react-modal-sheet'
import Options from './Options'
import clsx from 'clsx'

import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { SubjectHero } from '../components/SubjectHero'
import { captureHeroSource } from '../utils/heroTransition'
import { useSettings } from '../contexts/SettingsContext'
import {
  allGameItems,
  availableGameItems,
  collectionGameItems,
  gameItemsToLearn,
} from '../core/db/gameItems'
import { CollectionPicker } from '../components/collections/CollectionPicker'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const subjectMatch = useMatch('/subjects/:subjectId')
  const subjectId = subjectMatch?.params.subjectId
  const openedSubjectIdRef = useRef<string | null>(null)
  const { online } = useNetwork()
  const location = useLocation()
  const {
    availableSubjects,
    dashboardSubjectSource,
    gameLevelMin,
    gameLevelMax,
    dashboardCollectionIds,
  } = useSettings()

  const [embla, setEmbla] = useState<EmblaCarouselType | null>(null)
  const [optionsOpened, setOptionsOpened] = useState(false)
  const [bookmarkSubject, setBookmarkSubject] = useState<Subject | null>(null)
  const [showBookmarkSelector, setShowBookmarkSelector] = useState(false)

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
    const queryOptions = {
      subjectTypes: availableSubjects,
      gameLevelMin,
      gameLevelMax,
    }

    const sourceItems = (() => {
      switch (dashboardSubjectSource) {
        case 'assigned':
          return gameItemsToLearn({ ...queryOptions, includeKana: true })
        case 'review':
          return availableGameItems({ ...queryOptions, includeKana: true })
        case 'collections':
          return collectionGameItems({ ...queryOptions, collectionIds: dashboardCollectionIds })
        case 'learned':
        default:
          return allGameItems({ ...queryOptions, includeKana: true })
      }
    })()

    // Never leave the dashboard empty: fall back to everything available, then
    // to kana (which is always populated) so there is always something to show.
    const firstNonEmpty = (...itemSets: Array<() => GameItem[]>) => {
      for (const getItems of itemSets) {
        const items = getItems()
        if (items.length > 0) return items
      }

      return []
    }

    // When the user has explicitly scoped the dashboard to specific collections,
    // honor that scope (even when it yields nothing) rather than backfilling with
    // unrelated items — so the "No collection items" empty state can show.
    const hasExplicitCollectionScope =
      dashboardSubjectSource === 'collections' && dashboardCollectionIds.length > 0

    const items = hasExplicitCollectionScope
      ? sourceItems
      : firstNonEmpty(
          () => sourceItems,
          () => allGameItems({ ...queryOptions, includeKana: true }),
          () => allGameItems({ includeKana: true }),
        )

    return _.chain(items).sampleSize(20).map('subject').value()
  }, [
    availableSubjects,
    gameLevelMin,
    gameLevelMax,
    dashboardCollectionIds,
    dashboardSubjectSource,
  ])

  const emptyDashboardLabel =
    dashboardSubjectSource === 'assigned'
      ? 'No assignments available'
      : dashboardSubjectSource === 'learned'
        ? 'No learned items'
        : dashboardSubjectSource === 'collections'
          ? 'No collection items'
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
          'w-full h-dvh flex overflow-hidden transition-opacity ease-in-out duration-300',
          optionsOpened && 'opacity-0',
        )}
      >
        {!online && (
          <IconWifiOff
            className="drop-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] absolute top-[calc(0.75rem_+_env(safe-area-inset-top))] right-[calc(0.75rem_+_env(safe-area-inset-right))] w-fit! text-white"
            stroke={3}
          />
        )}

        <Group
          gap="sm"
          wrap="nowrap"
          className="justify-between! absolute! z-10 w-full bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] py-0 px-6 pointer-events-none max-w-4xl left-0! right-0! mx-auto!"
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
              onBookmarkClick={() => {
                setBookmarkSubject(subject)
                setShowBookmarkSelector(true)
              }}
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

      <Sheet
        isOpen={showBookmarkSelector}
        onClose={() => setShowBookmarkSelector(false)}
        onCloseEnd={() => setBookmarkSubject(null)}
        style={{ zIndex: 30 }}
        detent="content"
      >
        <Sheet.Container className="rounded-t-2xl! rounded-b-none! overflow-hidden max-w-3xl! mx-auto! left-0! right-0!">
          <Sheet.Content>
            <Paper className="rounded-none!">
              <Box className="py-4">
                <Center>
                  <Sheet.DragIndicator />
                </Center>
              </Box>

              <CollectionPicker
                subjects={bookmarkSubject ? [bookmarkSubject] : []}
                onDone={() => setShowBookmarkSelector(false)}
              />
            </Paper>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onClick={() => setShowBookmarkSelector(false)} />
      </Sheet>
    </>
  )
}

type SlideProps = {
  subject: Subject
  onInfoClick?: () => void
  onBookmarkClick?: () => void
}

const Slide = ({ subject, onInfoClick, onBookmarkClick }: SlideProps) => {
  const heroContentRef = useRef<HTMLDivElement>(null)

  // Snapshot the hero so it flies into the flashcard, whether the open was
  // triggered by tapping the characters or the info button.
  const handleInfoClick = () => {
    captureHeroSource(heroContentRef.current)
    onInfoClick?.()
  }

  return (
    <Carousel.Slide>
      <div className="justify-center h-full flex">
        <Center className=" flex-col gap-6 w-full">
          <div className="relative -mt-10">
            <SubjectHero subject={subject} onClick={handleInfoClick} contentRef={heroContentRef} />

            <div className="absolute left-1/2 -translate-x-1/2 top-full w-max">
              <Group className="mt-10" wrap="nowrap" gap="lg">
                <ActionIcon
                  variant="transparent"
                  size="xl"
                  onClick={handleInfoClick}
                  aria-label="Show item details"
                >
                  <IconInfoCircle
                    className="drop-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] text-white/80"
                    stroke={1.5}
                    size={48}
                  />
                </ActionIcon>

                <ActionIcon
                  variant="transparent"
                  size="xl"
                  onClick={onBookmarkClick}
                  aria-label="Save item to collection"
                >
                  <IconBookmarkPlus
                    className="drop-shadow-[2px_2px_2px_rgba(0,0,0,0.5)] text-white/80"
                    stroke={1.5}
                    size={40}
                  />
                </ActionIcon>
              </Group>
            </div>
          </div>
        </Center>
      </div>
    </Carousel.Slide>
  )
}
