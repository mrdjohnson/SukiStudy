import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Subject, SubjectType, StudyMaterial } from '../types'
import { Icons } from './Icons'
import { Button } from './ui/Button'
import { ARTWORK_URLS } from '../utils/artworkUrls'
import { toRomanji } from '../utils/romanji'
import { Modal, Image, ActionIcon, Stack, Badge, Group, Loader } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import clsx from 'clsx'
import { openFlashcardModal } from './modals/FlashcardModal'
import { studyMaterials, subjects } from '../services/db'
import _ from 'lodash'
import { GameItemIcon } from './GameItemIcon'
import Markdown from 'react-markdown'
import { colorByType, themeByType } from '../utils/subject'
import useReactivity from '../hooks/useReactivity'
import { ReviewHistoryChart } from './ReviewHistoryChart'
import { encounterService } from '../services/encounterService'

type FlashcardProps = {
  index?: number
  isPopup?: boolean
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
          className="rounded-lg shadow-sm border border-gray-100 max-h-64 mx-auto object-contain transition-transform group-hover:scale-[1.02]"
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
  isPopup = false,
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
    if (!isPopup || !subject) return null

    return encounterService.getItemStats(subject.id)
  }, [subject?.id, isPopup])

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
  const primaryReading = subject.readings?.find(r => r.primary)?.reading

  const renderInteractiveSentence = (jaSentence: string) => {
    const parts = jaSentence.split(/([一-龯]+)/)
    return (
      <span>
        {parts.map((part, i) => {
          const isKanji = /[一-龯]/.test(part)
          if (isKanji) {
            return (
              <span key={i} className="font-bold text-gray-800">
                {part}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </span>
    )
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
    <div
      className={`w-full max-w-2xl mx-auto perspective-1000 ${isPopup ? 'h-auto' : ''}`}
      onClick={e => e.stopPropagation()}
    >
      <div
        className={`rounded-2xl shadow-xl bg-white overflow-hidden border border-gray-100 flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Back Header */}
        <div className={clsx(`p-6 border-b relative`, themeByType[type])}>
          <div className="flex gap-4">
            <GameItemIcon subject={subject} size="lg" />

            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
                {primaryMeaning}
              </h2>

              {primaryReading && (
                <div className="flex items-center gap-3">
                  <span className="text-xl text-gray-600 font-medium">{primaryReading}</span>
                  {subject.pronunciation_audios && subject.pronunciation_audios.length > 0 && (
                    <button
                      onClick={playAudio}
                      className="p-2 bg-white/50 hover:bg-white rounded-full text-indigo-600 transition-colors shadow-sm"
                      title="Play Audio"
                    >
                      <Icons.Volume className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <Stack className="absolute top-2 right-2" gap="xs">
              <Badge color={colorByType[type]}>{type}</Badge>

              {subject.level > 0 && (
                <div className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200 w-fit ml-auto">
                  Lv {subject.level}
                </div>
              )}

              {subject.document_url && (
                <a
                  href={subject.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 hover:text-pink-500 hover:border-pink-200 border border-gray-200 w-fit ml-auto flex items-center gap-1 transition-colors"
                  onClick={e => e.stopPropagation()}
                  title="Open in WaniKani"
                >
                  WK
                  <Icons.Link className="w-3 h-3" />
                </a>
              )}
            </Stack>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
          {studyMaterial && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 space-y-2">
              {studyMaterial.meaning_synonyms.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-yellow-600 uppercase">
                    Your Synonyms:{' '}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {studyMaterial.meaning_synonyms.join(', ')}
                  </span>
                </div>
              )}
              {(studyMaterial.meaning_note || studyMaterial.reading_note) && (
                <div className="space-y-2 pt-1">
                  {studyMaterial.meaning_note && (
                    <p className="text-sm text-gray-700">
                      <strong>Meaning Note:</strong> {studyMaterial.meaning_note}
                    </p>
                  )}
                  {studyMaterial.reading_note && (
                    <p className="text-sm text-gray-700">
                      <strong>Reading Note:</strong> {studyMaterial.reading_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {subject.isKana ? (
            <div className="prose prose-spacing">
              <Markdown>{subject.meaning_mnemonic}</Markdown>
            </div>
          ) : (
            <div
              className="text-gray-700 leading-relaxed text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: subject.meaning_mnemonic }}
            />
          )}

          {subject.reading_mnemonic && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Reading Mnemonic
              </h3>
              <div
                className="text-gray-700 leading-relaxed text-sm md:text-base"
                dangerouslySetInnerHTML={{ __html: subject.reading_mnemonic }}
              />
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
                {meanings.map(meanings => (
                  <div key={meanings}>{meanings}</div>
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
                {subject.context_sentences.slice(0, 3).map((s, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p className="text-base mb-1 font-medium text-gray-800">
                      {renderInteractiveSentence(s.ja)}
                    </p>
                    <p className="text-gray-500 text-xs">{s.en}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isPopup && itemStats && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Your Stats
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{itemStats.reviewCount}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {itemStats.averageScore}%
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
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
                    <ReviewHistoryChart results={itemStats.history} />
                  </div>
                )}
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

          {components.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {type === SubjectType.VOCABULARY ? 'Kanji Composition' : 'Radicals'}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {components.map((comp, index) => {
                  const compType = getSubjectType(comp)
                  const compChar = comp.characters
                  const compImg = comp.character_images?.find(
                    i => i.content_type === 'image/svg+xml',
                  )?.url
                  return (
                    <div
                      key={comp.id}
                      onClick={() => openFlashcardModal(components, index)}
                      className={`
                          p-2 rounded-lg border text-center cursor-pointer transition-all hover:shadow-md active:scale-95
                          ${compType === SubjectType.RADICAL ? 'bg-sky-50 border-sky-100 hover:border-sky-300' : 'bg-pink-50 border-pink-100 hover:border-pink-300'}
                        `}
                    >
                      <div className="text-2xl font-bold text-gray-800 mb-1">
                        {compChar || (
                          <div className="w-8 h-8 mx-auto">
                            {compImg && <img src={compImg} alt="" className="w-full h-full" />}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] leading-tight text-gray-600 truncate px-1">
                        {comp.meanings[0].meaning}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Group className="mt-8 px-4">
        <Button
          variant="subtle"
          onClick={handlePrev}
          leftSection={<Icons.ChevronLeft className="w-5 h-5" />}
          disabled={!hasPrev}
          className={clsx(!hasPrev && '!hidden')}
        >
          Prev
        </Button>

        <Button
          variant="subtle"
          onClick={handleNext}
          disabled={!hasNext}
          rightSection={<Icons.ChevronRight className="w-5 h-5" />}
          className={clsx('ml-auto', !hasNext && '!hidden')}
        >
          Next
        </Button>
      </Group>

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
