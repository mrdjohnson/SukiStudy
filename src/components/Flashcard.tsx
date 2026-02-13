import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { Subject, SubjectType, StudyMaterial } from '../types'
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
  Text,
  Typography,
  Paper,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import clsx from 'clsx'
import { openFlashcardModal } from './modals/FlashcardModal'
import { studyMaterials, subjects } from '../services/db'
import _ from 'lodash'
import { GameItemIcon } from './GameItemIcon'
import Markdown from 'react-markdown'
import { themeByType } from '../utils/subject'
import useReactivity from '../hooks/useReactivity'
import { encounterService } from '../services/encounterService'
import { FlashcardHeader } from './FlashcardHeader'

const ReviewHistoryChart = React.lazy(() =>
  import('./ReviewHistoryChart').then(m => ({ default: m.ReviewHistoryChart })),
)

type FlashcardProps = {
  index?: number
  modalId: string
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
          className="rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 max-h-64 mx-auto object-contain transition-transform group-hover:scale-[1.02]"
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
        <div className="relative w-full h-screen flex items-center justify-center bg-black">
          <ActionIcon
            variant="filled"
            color="gray"
            size="lg"
            radius="xl"
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
            onClick={e => {
              e.stopPropagation()
              close()
            }}
          >
            <Icons.X size={20} />
          </ActionIcon>
          <Image
            src={imageUrl}
            fit="contain"
            h="90vh"
            w="auto"
            onClick={e => e.stopPropagation()}
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
}: FlashcardProps) => {
  const [components, setComponents] = useState<Subject[]>([])
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null)
  const [audioIndex, setAudioIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(index)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  useEffect(() => {
    setAudioIndex(0)
    setStudyMaterial(null)
    setComponents([])

    if (!subject) {
      return
    }

    const studyMaterial = studyMaterials.findOne({ subject_id: subject.id })

    setStudyMaterial(studyMaterial || null)

    if (!_.isEmpty(subject.component_subject_ids)) {
      const subjectComponents = subjects
        .find({ id: { $in: subject.component_subject_ids } })
        .fetch()
      setComponents(subjectComponents)
    }
  }, [subject])

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

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audios = subject.pronunciation_audios || []
    if (audios.length === 0) return

    const audioUrl = audios[audioIndex % audios.length].url
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play()
    } else {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play()
    }
    setAudioIndex(prev => prev + 1)
  }

  const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning

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

  const meanings = useMemo(() => {
    return _.chain(subject.meanings)
      .map('meaning')
      .concat(..._.map(subject.auxiliary_meanings, 'meaning'))
      .without(primaryMeaning || '')
      .uniq()
      .value()
  }, [])

  return (
    <div className={`w-full max-w-2xl mx-auto h-full`} onClick={e => e.stopPropagation()}>
      <div
        className={`shadow-xl overflow-hidden flex flex-col h-full`}
        onClick={e => e.stopPropagation()}
      >
        <FlashcardHeader
          subject={subject}
          type={type}
          playAudio={playAudio}
          onClose={() => modals.close(modalId)}
        />

        <Paper
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left perspective-1000 max-h-full"
          shadow="sm"
        >
          {/* todo: move this to meanings section */}
          {studyMaterial && (
            <div
              className={clsx(
                'text-black dark:text-gray-300 py-2 px-4 rounded-lg space-y-2',
                themeByType[type],
              )}
            >
              {studyMaterial.meaning_synonyms.length > 0 && (
                <>
                  <span className="text-xs font-bold uppercase">Your Synonyms:</span>

                  <div className="text-sm font-medium pl-2">
                    {studyMaterial.meaning_synonyms.map(synonym => (
                      <p key={synonym}>- {synonym}</p>
                    ))}
                  </div>
                </>
              )}

              {(studyMaterial.meaning_note || studyMaterial.reading_note) && (
                <>
                  <span className="text-xs font-bold uppercase pt-2">Your Notes:</span>

                  <div className="text-sm font-medium pl-2">
                    {studyMaterial.meaning_note && <p>{studyMaterial.meaning_note}</p>}
                    {studyMaterial.reading_note && <p>{studyMaterial.reading_note}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {subject.isKana ? (
            <div className="prose prose-spacing text-gray-800 prose-code:text-gray-800 dark:text-gray-300 dark:prose-code:text-gray-300">
              <Markdown>{subject.meaning_mnemonic}</Markdown>
            </div>
          ) : (
            <Typography>
              <div dangerouslySetInnerHTML={{ __html: subject.meaning_mnemonic }} />
            </Typography>
          )}

          {subject.reading_mnemonic && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Reading Mnemonic
              </h3>

              <Typography>
                <div dangerouslySetInnerHTML={{ __html: subject.reading_mnemonic }} />
              </Typography>
            </div>
          )}

          {subject.readings?.[0] && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Readings
              </h3>

              <div className="space-y-3">
                {subject.readings.map(reading => (
                  <div key={reading.reading}>
                    {reading.reading}, {toRomanji(reading.reading)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {meanings[0] && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Meanings
              </h3>

              <div className="space-y-3">
                {meanings.map(meaning => (
                  <div key={meaning}>{meaning}</div>
                ))}
              </div>
            </div>
          )}

          {subject.context_sentences && subject.context_sentences.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Context Sentences
              </h3>

              <div className="space-y-3">
                {subject.context_sentences.slice(0, 5).map((s, i) => (
                  <Box key={i} className="p-3 rounded-lg text-sm bg-gray-300 dark:bg-gray-600">
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

          {components.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {type === SubjectType.VOCABULARY ? 'Kanji Composition' : 'Radicals'}
              </h3>

              <Group>
                {components.map(subject => (
                  <Stack
                    gap="xs"
                    className="bg-gray-200 dark:bg-slate-600 p-2 px-4 rounded-md cursor-pointer"
                    onClick={() => openFlashcardModal([subject])}
                  >
                    <GameItemIcon subject={subject} />

                    {subject.meanings?.[0]?.meaning && (
                      <Text className="text-sm! leading-tight! truncate! px-1 text-center">
                        {subject.meanings?.[0]?.meaning}
                      </Text>
                    )}
                  </Stack>
                ))}
              </Group>
            </div>
          )}
        </Paper>

        <Group className="py-4 px-4 shrink-0" hidden={!(hasPrev || hasNext)}>
          <Button
            variant="subtle"
            onClick={handlePrev}
            leftSection={<Icons.ChevronLeft className="w-5 h-5" />}
            disabled={!hasPrev}
            className={clsx(!hasPrev && 'hidden!')}
          >
            Prev
          </Button>

          <Button
            variant="subtle"
            onClick={handleNext}
            disabled={!hasNext}
            rightSection={<Icons.ChevronRight className="w-5 h-5" />}
            className={clsx('ml-auto', !hasNext && 'hidden!')}
          >
            Next
          </Button>
        </Group>
      </div>

      <style>{`
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}
