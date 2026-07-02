import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  Suspense,
  useSyncExternalStore,
} from 'react'
import clsx from 'clsx'
import { SubjectType } from '../core/types'
import type { Subject, StudyMaterial, ReadingType } from '../core/types'
import { Icons } from './Icons'
import { Button } from './ui/Button'
import { toRomanji } from '../utils/romanji'
import {
  ActionIcon,
  Stack,
  Group,
  Loader,
  Box,
  Paper,
  Text,
  Badge,
  HoverCard,
  Center,
  SimpleGrid,
  Tooltip,
  UnstyledButton,
  useMatches,
} from '@mantine/core'
import { useIntersection } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { flashcardStack } from './flashcardStack'
import { studyMaterials, subjects } from '../core/db'
import _ from 'lodash'
import { GameItemIcon } from './GameItemIcon'
import useReactivity from '../hooks/useReactivity'
import { encounterService } from '../services/encounterService'
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconInfoCircle,
  IconChevronCompactUp,
  IconChevronLeft,
  IconChevronRight,
  IconEyeOff,
  IconList,
} from '@tabler/icons-react'
import { DynamicLanguageIcon } from './DynamicLanguageIcon'
import { useSettings } from '../contexts/SettingsContext'
import { SubjectHero } from './SubjectHero'
import { FlashcardCollections } from './collections/FlashcardCollections'
import { useIsSubjectHidden } from '../hooks/useHiddenSubjects'
import { playHeroTransition } from '../utils/heroTransition'
import { MnemonicImage } from './MnemonicImage'
import { FlashcardItemList } from './FlashcardItemList'
import { FlashcardMnemonics } from './FlashcardMnemonics'
import { FlashcardStats } from './FlashcardStats'

const READING_EXPLANATIONS: Record<string, string> = {
  onyomi:
    'The Chinese-derived reading of a kanji, typically used when the kanji is part of a compound word.',
  kunyomi:
    'The native Japanese reading of a kanji, often used when the kanji stands alone as a word.',
  nanori: 'Specialized readings used primarily for Japanese names.',
}

export const getSubjectLabel = (subject: Subject) => {
  return (
    subject.characters ||
    subject.meanings.find(meaning => meaning.primary)?.meaning ||
    subject.meanings[0]?.meaning ||
    subject.slug
  )
}

type FlashcardProps = {
  index?: number
  modalId?: string
  depth?: number
  onIndexChanged?: (value: number) => void
} & (
  | {
      ids: number[]
      items?: never
    }
  | {
      ids?: never
      items: Subject[]
    }
)

export const Flashcard: React.FC<FlashcardProps> = ({
  ids,
  items,
  index = 0,
  onIndexChanged,
  modalId,
  depth = 0,
}: FlashcardProps) => {
  const crumbs = useSyncExternalStore(flashcardStack.subscribe, flashcardStack.getSnapshot)
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null)
  const [itemIndex, setItemIndex] = useState(index)
  const viewportRef = useRef<HTMLDivElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  // Remembers each stack level's scroll so popping back to a card restores it.
  const scrollByDepthRef = useRef<Map<number, number>>(new Map())
  const prevDepthRef = useRef(depth)
  const [isReadingJapanese, setIsReadingJapanese] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioIndexRef = useRef(0)

  // Fly the clicked source element (dashboard hero or a GameItemIcon) into this
  // card's hero. Keyed on modalId, not mount: Mantine's modal manager reuses this
  // component instance when drilling into a related subject (it renders only the
  // top modal and swaps its content), so a mount-only effect would never fire for
  // drilled-in cards. modalId changes per opened card but is stable across
  // prev/next, so this runs for opens/drills but not in-card navigation. No-op
  // when nothing was captured (e.g. programmatic opens).
  useLayoutEffect(() => {
    playHeroTransition(heroContentRef.current)
  }, [modalId])

  const allItems = useMemo(() => {
    const all = items || subjects.find({ id: { $in: ids } }).fetch()

    return all.map(subject => ({ ...subject, label: getSubjectLabel(subject) }))
  }, [ids, items])

  const subject = allItems[itemIndex]

  const hasNext = itemIndex < allItems.length - 1

  const hasPrev = itemIndex > 0

  const hasList = allItems.length > 1
  const [listOpen, setListOpen] = useState(false)

  const itemStats = useReactivity(() => {
    if (!subject) return null

    return encounterService.getItemStats(subject.id)
  }, [subject?.id])

  const isHidden = useIsSubjectHidden(subject?.id)

  useEffect(() => {
    setStudyMaterial(null)

    if (!subject) {
      return
    }

    const studyMaterial = studyMaterials.findOne({ subject_id: subject.id })

    setStudyMaterial(studyMaterial || null)
  }, [subject?.id])

  useEffect(() => {
    setItemIndex(index)
  }, [index])

  const handleNext = () => {
    setItemIndex(itemIndex + 1)
    onIndexChanged?.(itemIndex + 1)
  }

  const handlePrev = () => {
    setItemIndex(itemIndex - 1)
    onIndexChanged?.(itemIndex - 1)
  }

  const handleSelectItem = (nextIndex: number) => {
    setItemIndex(nextIndex)
    onIndexChanged?.(nextIndex)
    setListOpen(false)
  }

  const { ref: heroRef, entry } = useIntersection({
    threshold: 0.5,
  })

  // The pinned header is visible if the hero is no longer intersecting the viewport
  const pinned = entry ? !entry.isIntersecting : false

  const meanings = useMemo(() => {
    if (!subject) return []
    return _.chain(subject.meanings)
      .map('meaning')
      .concat(..._.map(subject.auxiliary_meanings, 'meaning'))
      .uniq()
      .value()
  }, [subject])

  const readingGroups = useMemo(() => {
    if (!subject || !subject.readings) return []

    return _.chain(subject.readings)
      .groupBy(r => r.type || '')
      .map((readings, type) => ({
        type: type || ('' as ReadingType),
        readings: readings.map(reading => reading.reading).join(', '),
      }))
      .filter(({ readings }) => readings.length > 0)
      .value()
  }, [subject])

  const { components, similars, vocabularies } = useMemo(() => {
    if (!subject) return { components: [], similars: [], vocabularies: [] }

    const ids = _.uniq([
      ...(subject.component_subject_ids || []),
      ..._.take(subject.visually_similar_subject_ids, 5),
      ..._.take(subject.amalgamation_subject_ids, 5),
    ])

    const related = subjects.find({ id: { $in: ids } }).fetch()
    const relatedById = _.keyBy(related, 'id')

    const components = _.chain(subject.component_subject_ids)
      .map(id => relatedById[id])
      .compact()
      .value()
    const similars = _.chain(subject.visually_similar_subject_ids)
      .map(id => relatedById[id])
      .compact()
      .value()
    const vocabularies = _.chain(subject.amalgamation_subject_ids)
      .map(id => relatedById[id])
      .compact()
      .value()

    return {
      components,
      similars,
      vocabularies,
    }
  }, [subject])

  const contextSentences = useMemo(() => {
    if (!subject) return null

    if (subject.context_sentences || _.isEmpty(vocabularies)) return subject.context_sentences

    const [vocabSubject] = vocabularies

    if (
      vocabSubject.component_subject_ids.length === 1 &&
      vocabSubject.component_subject_ids[0] === subject.id
    ) {
      return vocabSubject.context_sentences
    }

    return null
  }, [subject, vocabularies])

  // Scroll to top for a new card at this level (open or prev/next), but restore
  // the saved position when popping back to a shallower card we've already seen,
  // so drilling in and closing feels "as if nothing changed".
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const poppedBack = depth < prevDepthRef.current
    prevDepthRef.current = depth

    const saved = scrollByDepthRef.current.get(depth)
    el.scrollTo({ top: poppedBack && saved != null ? saved : 0 })
  }, [subject?.id, depth])

  useEffect(() => {
    audioIndexRef.current = 0
  }, [subject?.id])

  // Keep this level's breadcrumb pointed at whatever subject is on screen.
  useEffect(() => {
    if (!subject || !modalId) return

    flashcardStack.update(depth, { id: subject.id, label: subject.label })
  }, [subject?.id, depth, modalId])

  const hasParent = depth > 0
  const visibleCrumbs = crumbs.slice(0, depth + 1)

  const handleClose = () => {
    // The stack is trimmed in the modal's onClose handler, so closing the top
    // modal reveals the parent (back) at deeper levels and dismisses at the root.
    if (modalId) modals.close(modalId)
  }

  const navigateToCrumb = (targetDepth: number) => {
    for (let level = crumbs.length - 1; level > targetDepth; level -= 1) {
      modals.close(crumbs[level].modalId)
    }
  }

  if (!subject) return <Loader />

  const getSubjectType = (s: Subject): SubjectType => {
    if (!s) return SubjectType.VOCABULARY

    if (s.object === 'radical') return SubjectType.RADICAL
    if (s.object === 'kanji') return SubjectType.KANJI
    if (s.object === 'hiragana') return SubjectType.HIRAGANA
    if (s.object === 'katakana') return SubjectType.KATAKANA
    return SubjectType.VOCABULARY
  }

  const type = getSubjectType(subject)

  const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning
  const primaryReading = subject.readings?.find(r => r.primary)?.reading
  const hasAudio = !!subject.pronunciation_audios?.[0]

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation()

    const audios = subject.pronunciation_audios || []
    const audioUrl = audios[audioIndexRef.current % audios.length]?.url
    if (!audioUrl) return

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    audioRef.current.src = audioUrl
    void audioRef.current.play()
    audioIndexRef.current += 1
  }

  // todo: if sentences are from the kanji then maybe reference its characters instead?
  const renderInteractiveSentence = (jaSentence: string) => {
    if (!subject.characters) return jaSentence

    const parts = jaSentence.split(subject.characters)

    return parts.flatMap((part, i) => {
      if (i === parts.length - 1) return part

      return [
        part,
        <span key={i} className="font-bold text-primary">
          {subject.characters}
        </span>,
      ]
    })
  }

  return (
    <div className={`w-full max-w-full mx-auto h-full`} onClick={e => e.stopPropagation()}>
      <div
        className="overflow-hidden flex h-full bg-black/60 md:border md:border-white/15 sm:rounded-[32px] md:rounded-2xl! relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Permanent item list on wide screens */}
        {hasList && (
          <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-white/10 bg-black/20">
            <FlashcardItemList
              items={allItems}
              currentIndex={itemIndex}
              onSelect={handleSelectItem}
            />
          </aside>
        )}

        <div className="relative flex h-full min-w-0 flex-1 flex-col">
          {/* top bar */}
          <Group className="px-4 py-2" wrap="nowrap" gap="xs">
            {modalId && (
              <Tooltip label={hasParent ? 'Back' : 'Close'} openDelay={300} withinPortal={false}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={hasParent ? 'Back to previous item' : 'Close'}
                  onClick={e => {
                    e.stopPropagation()
                    handleClose()
                  }}
                  className="border! border-transparent! border-b-white/20! shrink-0"
                  radius="xl"
                >
                  {hasParent ? <IconArrowLeft size={16} /> : <Icons.X size={14} />}
                </ActionIcon>
              </Tooltip>
            )}

            {visibleCrumbs.length > 1 && (
              <Group
                gap={2}
                wrap="nowrap"
                translate="no"
                className="min-w-0 flex-1 overflow-x-auto no-scrollbar"
              >
                {visibleCrumbs.map((crumb, crumbIndex) => {
                  const isCurrent = crumbIndex === depth

                  return (
                    <Group gap={2} wrap="nowrap" key={crumb.modalId} className="shrink-0">
                      {crumbIndex > 0 && (
                        <IconChevronRight size={12} className="text-white/40 shrink-0" />
                      )}
                      <UnstyledButton
                        disabled={isCurrent}
                        onClick={e => {
                          e.stopPropagation()
                          if (!isCurrent) navigateToCrumb(crumbIndex)
                        }}
                        className={clsx(
                          'max-w-32 truncate text-xs transition-colors',
                          isCurrent
                            ? 'cursor-default font-semibold text-white'
                            : 'text-white/50 hover:text-white/90',
                        )}
                      >
                        {crumb.label}
                      </UnstyledButton>
                    </Group>
                  )
                })}
              </Group>
            )}

            <Group className="ml-auto shrink-0" wrap="nowrap" gap="xs">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={handlePrev}
                disabled={!hasPrev}
                className="border! border-transparent! border-l-white/20! border-b-white/20! text-white/50! disabled:opacity-0! transition-opacity duration-300 ease-in-out"
                radius="xl"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>

              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={handleNext}
                disabled={!hasNext}
                className="border! border-transparent! border-r-white/20! border-b-white/20! text-white/50! disabled:opacity-0! transition-opacity duration-300 ease-in-out"
                radius="xl"
              >
                <IconChevronRight size={18} />
              </ActionIcon>

              {hasList && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setListOpen(open => !open)}
                  aria-label="Show item list"
                  className="md:hidden! border! border-transparent! border-b-white/20! text-white/50!"
                  radius="xl"
                >
                  <IconList size={18} />
                </ActionIcon>
              )}
            </Group>
          </Group>

          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              padding: 'var(--mantine-spacing-xs)',
              height: 60,
              zIndex: 1000000,
              transform: `translate3d(0, ${pinned ? 0 : '-110px'}, 0)`,
              transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
              backgroundColor: 'var(--mantine-color-body)',
              borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
            onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-b-xl! cursor-pointer md:rounded-t-2xl!"
          >
            <Center className="absolute top-0 right-0 left-0 opacity-30">
              <IconChevronCompactUp />
            </Center>

            <Group justify="space-between" h="100%" wrap="nowrap" className="relative flex">
              <Group gap="sm" wrap="nowrap" translate="no" className="cursor-pointer">
                <GameItemIcon subject={subject} size="xs" no-animate />
                <Text fw={600} size="sm">
                  {toRomanji(primaryReading || '')}
                </Text>
                <Text c="dimmed" size="sm" lineClamp={1}>
                  {primaryMeaning}
                </Text>
              </Group>
              {hasAudio && (
                <ActionIcon
                  variant="subtle"
                  onClick={e => {
                    e.stopPropagation()
                    playAudio(e)
                  }}
                  radius="xl"
                >
                  <IconPlayerPlay size={18} />
                </ActionIcon>
              )}
            </Group>
          </Box>

          <div
            className="fixed bottom-0 right-0 left-0 h-6 bg-black z-90"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 24px)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 24px)',
            }}
          />

          <Paper
            ref={viewportRef}
            onScroll={e => scrollByDepthRef.current.set(depth, e.currentTarget.scrollTop)}
            className="flex-1 overflow-y-auto py-6 p-4 pr-5 space-y-6 custom-scrollbar text-left max-h-full bg-transparent! relative w-full! scroll-p-6!"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 24px)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 24px)',
            }}
            shadow="sm"
            translate="no"
          >
            {/* hero section */}
            <section
              ref={heroRef}
              className=" bg-linear-to-br from-white/20 to-transparent via-80% via-transparent border border-transparent border-b-white/10 border-r-white/10 rounded-4xl p-8 px-2 relative overflow-hidden flex flex-col items-center justify-center min-h-70 shadow-xs shadow-white/20 mb-4 group"
            >
              {isHidden && (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white/70 backdrop-blur-sm"
                  title="This item is hidden"
                >
                  <IconEyeOff size={14} />
                  Hidden
                </div>
              )}

              <SubjectHero subject={subject} contentRef={heroContentRef} />
            </section>

            <section className="text-right font-semibold">{_.upperCase(type)}</section>

            <section>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Meanings
              </h3>

              <Group gap="sm">
                {meanings.map(meaning => (
                  <Badge
                    key={meaning}
                    color="gray"
                    variant="default"
                    className="shrink-0 p-4! font-normal!"
                    size="lg"
                  >
                    {meaning}
                  </Badge>
                ))}
              </Group>

              {studyMaterial && (
                <Stack gap="xs" mt="md" className="pl-1">
                  {studyMaterial.meaning_synonyms.length > 0 && (
                    <Group gap="xs">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        Synonyms:
                      </Text>
                      {studyMaterial.meaning_synonyms.map(synonym => (
                        <Badge key={synonym} size="sm" variant="light" color="gray">
                          {synonym}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  {studyMaterial.meaning_note && (
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                        Meaning Note:
                      </Text>
                      <Text size="sm">{studyMaterial.meaning_note}</Text>
                    </Box>
                  )}

                  {studyMaterial.reading_note && (
                    <Box>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                        Reading Note:
                      </Text>
                      <Text size="sm">{studyMaterial.reading_note}</Text>
                    </Box>
                  )}
                </Stack>
              )}
            </section>

            {/* hide if there are no readings */}
            <section hidden={!readingGroups[0]}>
              <Group className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Readings
                <Button
                  variant="transparent"
                  color="white"
                  onClick={() => setIsReadingJapanese(!isReadingJapanese)}
                >
                  <DynamicLanguageIcon japanese={isReadingJapanese} />
                </Button>
              </Group>

              <Group gap="sm" grow align="stretch">
                {readingGroups.map(({ type, readings }) => (
                  <Paper key={type} className="p-3 rounded-xl! relative group/reading">
                    <Stack gap="xs">
                      {type && (
                        <Group className="justify-between!">
                          <Text className="text-xs! uppercase font-bold opacity-70">{type}</Text>

                          {READING_EXPLANATIONS[type] && (
                            <HoverCard width={300} position="bottom" withArrow withinPortal={false}>
                              <HoverCard.Target>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  className="opacity-50"
                                >
                                  <IconInfoCircle size={14} />
                                </ActionIcon>
                              </HoverCard.Target>

                              <HoverCard.Dropdown className="z-50">
                                <Text>{READING_EXPLANATIONS[type]}</Text>
                              </HoverCard.Dropdown>
                            </HoverCard>
                          )}
                        </Group>
                      )}
                      <Text className="text-primary! font-semibold! text-lg">
                        {isReadingJapanese ? readings : toRomanji(readings)}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </Group>
            </section>

            <FlashcardMnemonics key={subject.id} subject={subject} />

            {contextSentences && contextSentences.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Context Sentences
                </h3>

                <div className="rounded-xl backdrop-blur-md px-3 divide-y divide-white/20">
                  {contextSentences.slice(0, 5).map((s, i) => (
                    <Box key={i} className="px-3 py-4 text-sm">
                      <Text className="mb-1 font-medium text-gray-100">
                        {renderInteractiveSentence(s.ja)}
                      </Text>

                      <Text className="text-sm! text-gray-400">{s.en}</Text>
                    </Box>
                  ))}
                </div>
              </div>
            )}

            {type !== SubjectType.VOCABULARY && subject.character_images?.[0] && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Visuals
                </h3>

                <Stack>
                  <MnemonicImage id={String(subject.id)} type={type} />

                  {subject.character_images.map(
                    image =>
                      image.url && (
                        <MnemonicImage
                          key={image.url}
                          id={String(subject.id)}
                          type={type}
                          url={image.url}
                        />
                      ),
                  )}
                </Stack>
              </div>
            )}

            {itemStats && <FlashcardStats stats={itemStats} />}

            <FlashcardCollections subject={subject} />

            <OtherSubjectsSection otherSubjects={components} title="Composition" />
            <OtherSubjectsSection otherSubjects={similars} title="Similar" />
            <OtherSubjectsSection otherSubjects={vocabularies} title="Vocabulary" />
          </Paper>
        </div>

        {/* Slide-over item list on narrow screens (a drawer within the card) */}
        {hasList && (
          <div
            className={clsx(
              'fixed inset-0 z-10 transition-opacity duration-200 md:hidden',
              listOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={() => setListOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <aside
              onClick={e => e.stopPropagation()}
              className={clsx(
                'absolute inset-y-0 right-0 flex w-64 max-w-[80%] flex-col border-l border-white/10 bg-zinc-900/95 shadow-2xl transition-transform duration-300 ease-out',
                listOpen ? 'translate-x-0' : 'translate-x-full',
              )}
            >
              <FlashcardItemList
                items={allItems}
                currentIndex={itemIndex}
                onSelect={handleSelectItem}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

const OtherSubjectsSection = ({
  otherSubjects,
  title,
}: {
  otherSubjects: Subject[]
  title: string
}) => {
  if (otherSubjects.length === 0) return null
  return (
    <div className="">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>

      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="sm"
        verticalSpacing="sm"
        className="transition-all ease-in-out duration-300"
      >
        {otherSubjects.map((component, index) => (
          <Group
            gap="xs"
            className="group bg-black/30! dark:bg-slate-600 p-4 rounded-xl cursor-pointer w-full min-w-0 border-[0.5px] border-transparent border-r-white/20 border-b-white/20 relative overflow-hidden backdrop-blur-sm"
            onClick={() => openFlashcardModal(otherSubjects, index, undefined, { child: true })}
            key={component.id}
            wrap="nowrap"
          >
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/20 blur-2xl rounded-full group-hover:bg-white/30 transition-all"></div>

            <div className="shrink-0">
              <GameItemIcon subject={component} />
            </div>

            {component.meanings?.[0]?.meaning && (
              <Text className="font-semibold! leading-tight! truncate! px-1 text-left min-w-0 group-hover:text-white!">
                {component.meanings?.[0]?.meaning}
              </Text>
            )}
          </Group>
        ))}
      </SimpleGrid>
    </div>
  )
}

const FlashcardModalWrapper: React.FC<{
  items: Subject[]
  index: number
  depth: number
  onIndexChanged?: (i: number) => void
}> = ({ items, index, depth, onIndexChanged }) => {
  const modalId = items[index].id.toString()
  const isMobile = useMatches({ base: true, sm: false })
  const { themeBackground } = useSettings()
  const modalRef = useRef<HTMLDivElement>(null)

  const backgroundUrl = themeBackground
    ? isMobile
      ? themeBackground.portraitUrl
      : themeBackground.landscapeUrl
    : ''

  // Give the desktop modal extra width when it shows the permanent item sidebar.
  const hasList = items.length > 1

  useEffect(() => {
    modals.updateModal({
      modalId,
      fullScreen: isMobile,
      size: hasList ? 'xl' : 'lg',
      withCloseButton: false,
      overlayProps: {
        style: backgroundUrl
          ? { backgroundImage: `url(${backgroundUrl})` }
          : { backgroundColor: 'black' },
        className: `bg-cover! bg-no-repeat brightness-75!`,
      },
    })
  }, [modalId, isMobile, hasList])

  return (
    <div
      onClick={() => modals.close(modalId)}
      className="h-full mx-auto my-auto bg-transparent! dark"
      id="flashcardModal"
      ref={modalRef}
      data-mantine-color-scheme="light"
    >
      <Suspense
        fallback={
          <Center className="w-screen h-svh items-center">
            <Loader />
          </Center>
        }
      >
        <Flashcard
          items={items}
          index={index}
          depth={depth}
          modalId={modalId}
          onIndexChanged={onIndexChanged}
        />
      </Suspense>
    </div>
  )
}

type OpenFlashcardModalOptions = {
  /** Drilling into a related subject — stacks on top instead of starting fresh. */
  child?: boolean
}

export const openFlashcardModal = (
  items: Subject[],
  index = 0,
  onIndexChanged?: (i: number) => void,
  options: OpenFlashcardModalOptions = {},
) => {
  const subject = items[index]
  const modalId = subject.id.toString()
  const crumb = { id: subject.id, label: getSubjectLabel(subject), modalId }

  if (options.child) {
    flashcardStack.push(crumb)
  } else {
    flashcardStack.reset(crumb)
  }

  const depth = flashcardStack.getSnapshot().length - 1

  modals.open({
    modalId,
    title: null,
    withCloseButton: false,
    padding: 0,
    size: 'lg',
    centered: true,
    // A plain fade keeps the content's geometry stable while it appears, so the
    // hero transition can measure the destination and morph into it accurately.
    transitionProps: { transition: 'fade', duration: 220 },
    // Trim the trail however the modal closes (button, overlay, or escape) so
    // the breadcrumbs stay in sync with the stack of open modals.
    onClose: () => flashcardStack.truncate(depth),
    children: (
      <FlashcardModalWrapper
        items={items}
        index={index}
        depth={depth}
        onIndexChanged={onIndexChanged}
      />
    ),
    classNames: {
      body: 'max-h-full overflow-hidden bg-transparent! w-full',
      content: 'flex! bg-transparent! w-full',
    },
  })
}
