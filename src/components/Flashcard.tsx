import React, { useState, useEffect, useRef, useMemo, Suspense, useSyncExternalStore } from 'react'
import clsx from 'clsx'
import { SubjectType } from '../core/types'
import type { Subject, StudyMaterial, ReadingType } from '../core/types'
import { Icons } from './Icons'
import { Button } from './ui/Button'
import { ARTWORK_URLS } from '../utils/artworkUrls'
import { toRomanji } from '../utils/romanji'
import {
  Modal,
  Image,
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
  SegmentedControl,
  SimpleGrid,
  Tooltip,
  UnstyledButton,
  useMatches,
} from '@mantine/core'
import { useDisclosure, useIntersection, useElementSize } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { flashcardStack } from './flashcardStack'
import { studyMaterials, subjects } from '../core/db'
import _ from 'lodash'
import { GameItemIcon } from './GameItemIcon'
import Markdown from 'react-markdown'
import useReactivity from '../hooks/useReactivity'
import { encounterService } from '../services/encounterService'
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconInfoCircle,
  IconChevronCompactUp,
  IconBulb,
  IconChevronLeft,
  IconChevronRight,
  IconEyeOff,
} from '@tabler/icons-react'
import { DynamicLanguageIcon } from './DynamicLanguageIcon'
import { useSettings } from '../contexts/SettingsContext'
import { SubjectHero } from './SubjectHero'
import { FlashcardCollections } from './collections/FlashcardCollections'
import { useIsSubjectHidden } from '../hooks/useHiddenSubjects'

const READING_EXPLANATIONS: Record<string, string> = {
  onyomi:
    'The Chinese-derived reading of a kanji, typically used when the kanji is part of a compound word.',
  kunyomi:
    'The native Japanese reading of a kanji, often used when the kanji stands alone as a word.',
  nanori: 'Specialized readings used primarily for Japanese names.',
}

const ReviewHistoryChart = React.lazy(() => import('./ReviewHistoryChart'))

export const getFlashcardCrumbLabel = (subject: Subject) =>
  subject.characters ||
  subject.meanings.find(meaning => meaning.primary)?.meaning ||
  subject.meanings[0]?.meaning ||
  subject.slug

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

// Global cache for failed image URLs to prevent flickering/re-checking in same session
const failedImages = new Set<string>()

const MnemonicImage: React.FC<{ id: string; type: SubjectType; url?: string }> = ({
  id,
  type,
  url: initialUrl = null,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl)
  const [error, setError] = useState(false)
  const [opened, { open, close }] = useDisclosure(false)

  useEffect(() => {
    if (initialUrl) {
      return
    }

    if (type === SubjectType.VOCABULARY) {
      setError(true)
      return
    }

    const url = ARTWORK_URLS[Number(id)]
    if (url) {
      if (failedImages.has(url)) {
        setError(true)
      } else {
        setImageUrl(url)
        setError(false)
      }
    } else {
      setError(true)
    }
  }, [id, type])

  const handleError = () => {
    if (imageUrl) failedImages.add(imageUrl)
    setError(true)
  }

  if (error || !imageUrl) return null

  return (
    <>
      <div
        className="mt-4 mb-4 relative group cursor-zoom-in inline-block"
        onClick={e => {
          e.stopPropagation()
          open()
        }}
      >
        <img
          src={imageUrl}
          alt={`${id} mnemonic visualization`}
          className="rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 max-h-64 mx-auto object-contain transition-transform group-hover:scale-[1.02] backdrop-blur-sm! w-full bg-linear-to-br from-white/20 to-transparent"
          onError={handleError}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg pointer-events-none">
          <Icons.Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
        {!initialUrl && (
          <p className="text-xs text-center text-gray-400 mt-1">
            Community Mnemonic Artwork (Tap to expand)
          </p>
        )}
      </div>

      <Modal
        opened={opened}
        onClose={close}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{ body: { backgroundColor: 'black' } }}
        zIndex={300}
      >
        <div
          className="relative w-full h-svh flex items-center justify-center bg-linear-to-br from-white/20 to-transparent backdrop-blur-sm!"
          onClick={e => {
            e.stopPropagation()
            close()
          }}
        >
          <ActionIcon
            variant="filled"
            color="gray"
            size="lg"
            radius="xl"
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
          >
            <Icons.X size={20} />
          </ActionIcon>
          <Image
            src={imageUrl}
            fit="contain"
            h="90vh"
            w="auto"
            className="backdrop-blur-sm! rounded-xl!"
          />
        </div>
      </Modal>
    </>
  )
}

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
  const mnemonicScrollRef = useRef<HTMLDivElement>(null)
  const [mnemonicTab, setMnemonicTab] = useState('meaning')
  const [isReadingJapanese, setIsReadingJapanese] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioIndexRef = useRef(0)

  const { ref: meaningSlideRef, height: meaningHeight } = useElementSize()
  const { ref: readingSlideRef, height: readingHeight } = useElementSize()

  const allItems = useMemo(() => {
    return items || subjects.find({ id: { $in: ids } }).fetch()
  }, [ids, items])

  const subject = allItems[itemIndex]

  const hasNext = itemIndex < allItems.length - 1

  const hasPrev = itemIndex > 0

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
    setMnemonicTab('meaning')
  }, [subject?.id])

  useEffect(() => {
    if (mnemonicScrollRef.current) {
      const index = mnemonicTab === 'meaning' ? 0 : 1
      const slideWidth = mnemonicScrollRef.current.offsetWidth
      mnemonicScrollRef.current.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth',
      })
    }
  }, [mnemonicTab])

  const handleMnemonicScrollEnd = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft
    const width = e.currentTarget.offsetWidth
    if (width === 0) return
    const index = Math.round(scrollLeft / width)
    const newTab = index === 0 ? 'meaning' : 'reading'
    if (newTab !== mnemonicTab) {
      setMnemonicTab(newTab)
    }
  }

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

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 })
  }, [subject?.id])

  useEffect(() => {
    audioIndexRef.current = 0
  }, [subject?.id])

  // Keep this level's breadcrumb pointed at whatever subject is on screen.
  useEffect(() => {
    if (!subject || !modalId) return

    flashcardStack.update(depth, { id: subject.id, label: getFlashcardCrumbLabel(subject) })
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
        className="overflow-hidden flex flex-col h-full bg-black/60 md:border md:border-white/15 sm:rounded-[32px] md:rounded-2xl! relative"
        // style={{
        //   boxShadow:
        //     '0 28px 80px rgba(0, 0, 0, 0.46), 0 10px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 -1px 0 rgba(0, 0, 0, 0.42)',
        // }}
        onClick={e => e.stopPropagation()}
      >
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
              <GameItemIcon subject={subject} size="xs" />
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

            <SubjectHero subject={subject} />
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

          <section>
            <Stack mb="xs">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                <IconBulb size={14} /> Mnemonics
              </h3>

              {subject.reading_mnemonic && (
                <SegmentedControl
                  size="xs"
                  radius="xl"
                  value={mnemonicTab}
                  onChange={setMnemonicTab}
                  data={[
                    { label: 'Meaning', value: 'meaning' },
                    { label: 'Reading', value: 'reading' },
                  ]}
                  className="bg-black/30! p-2! backdrop-blur-sm"
                />
              )}
            </Stack>

            <div
              className="overflow-hidden transition-[height] duration-300 ease-in-out backdrop-blur-sm p-4 rounded-xl bg-black/30"
              style={{
                height:
                  mnemonicTab === 'meaning' ? (meaningHeight || 0) + 30 : (readingHeight || 0) + 30,
              }}
            >
              <div
                ref={mnemonicScrollRef}
                onScrollEnd={handleMnemonicScrollEnd}
                className="flex items-start overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar scroll-smooth gap-4"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {/* Meaning Slide */}
                <div className="w-full shrink-0 snap-start">
                  <div ref={meaningSlideRef}>
                    <Stack gap="md">
                      <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                        {subject.isKana ? (
                          <Markdown>{subject.meaning_mnemonic}</Markdown>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: subject.meaning_mnemonic }} />
                        )}
                      </div>

                      {subject.meaning_hint && (
                        <Box className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50">
                          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                            Hint
                          </Text>
                          <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                            <div dangerouslySetInnerHTML={{ __html: subject.meaning_hint }} />
                          </div>
                        </Box>
                      )}
                    </Stack>
                  </div>
                </div>

                {/* Reading Slide */}
                {!!subject.reading_mnemonic && (
                  <div className="w-full shrink-0 snap-start">
                    <div ref={readingSlideRef}>
                      <Stack gap="md">
                        <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                          <div dangerouslySetInnerHTML={{ __html: subject.reading_mnemonic }} />
                        </div>
                        {subject.reading_hint && (
                          <Box className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                              Hint
                            </Text>
                            <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                              <div dangerouslySetInnerHTML={{ __html: subject.reading_hint }} />
                            </div>
                          </Box>
                        )}
                      </Stack>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {contextSentences && contextSentences.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Context Sentences
              </h3>

              <div className="rounded-xl backdrop-blur-md px-3 divide-y divide-white/20">
                {contextSentences.slice(0, 5).map((s, i) => (
                  <Box key={i} className="px-3 py-4 text-sm">
                    <Text className="mb-1 font-medium text-black">
                      {renderInteractiveSentence(s.ja)}
                    </Text>

                    <Text className=" text-sm!">{s.en}</Text>
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

          {itemStats && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Your Stats
              </h3>
              <div className="border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{itemStats.reviewCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{itemStats.averageScore}%</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {itemStats.lastGameId ? (
                        <span className="capitalize">{itemStats.lastGameId}</span>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Last Game</div>
                  </div>
                </div>

                {itemStats.history.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Review History
                    </h4>
                    <Suspense
                      fallback={
                        <div className="h-32 flex items-center justify-center">
                          <Loader size="sm" />
                        </div>
                      }
                    >
                      <ReviewHistoryChart results={itemStats.history} />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
          )}

          <FlashcardCollections subject={subject} />

          <OtherSubjectsSection otherSubjects={components} title="Composition" />
          <OtherSubjectsSection otherSubjects={similars} title="Similar" />
          <OtherSubjectsSection otherSubjects={vocabularies} title="Vocabulary" />
        </Paper>
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

  useEffect(() => {
    modals.updateModal({
      modalId,
      fullScreen: isMobile,
      withCloseButton: false,
      overlayProps: {
        style: backgroundUrl
          ? { backgroundImage: `url(${backgroundUrl})` }
          : { backgroundColor: 'black' },
        className: `bg-cover! bg-no-repeat brightness-75!`,
      },
    })
  }, [modalId, isMobile])

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
  const crumb = { id: subject.id, label: getFlashcardCrumbLabel(subject), modalId }

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
