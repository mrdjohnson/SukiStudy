import React, { useState, useEffect, useRef } from 'react'
import { Subject, SubjectType, Assignment, StudyMaterial } from '../types'
import { Icons } from './Icons'
import { generateExplanation } from '../services/geminiService'
import { waniKaniService } from '../services/wanikaniService'
import ReactMarkdown from 'react-markdown'
import { Button } from './ui/Button'
import { ARTWORK_URLS } from '../utils/artworkUrls'
import { toRomanji } from '../utils/romanji'
import { Modal, Image, ActionIcon, Stack, Badge, Group } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import clsx from 'clsx'
import { openFlashcardModal } from './modals/FlashcardModal'

interface FlashcardProps {
  subject: Subject
  assignment?: Assignment
  onNext?: () => void
  onPrev?: () => void
  hasPrev: boolean
  hasNext: boolean
  onDrillDown?: (subject: Subject) => void
}

// Global cache for failed image URLs to prevent flickering/re-checking in same session
const failedImages = new Set<string>()

const MnemonicImage: React.FC<{ id: string; type: SubjectType }> = ({ id, type }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [opened, { open, close }] = useDisclosure(false)

  useEffect(() => {
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
        <p className="text-xs text-center text-gray-400 mt-1">
          Community Mnemonic Artwork (Tap to expand)
        </p>
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
  subject,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  onDrillDown,
}) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [components, setComponents] = useState<Subject[]>([])
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null)
  const [audioIndex, setAudioIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setAiExplanation(null)
    setLoadingAi(false)
    setAudioIndex(0)
    setStudyMaterial(null)
    setComponents([])

    const loadData = async () => {
      if (subject.id) {
        try {
          const matCol = await waniKaniService.getStudyMaterials([subject.id])
          if (matCol.data && matCol.data.length > 0) {
            setStudyMaterial(matCol.data[0].data)
          }
        } catch (e) {
          console.error('Failed user materials', e)
        }
      }

      if (subject.component_subject_ids && subject.component_subject_ids.length > 0) {
        try {
          const col = await waniKaniService.getSubjects(subject.component_subject_ids)
          if (col && col.data) {
            setComponents(
              col.data.map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url })),
            )
          }
        } catch (e) {
          console.error('Failed to load components', e)
        }
      }
    }
    loadData()
  }, [subject.id])

  const getSubjectType = (s: Subject): SubjectType => {
    if (s.object === 'radical') return SubjectType.RADICAL
    if (s.object === 'kanji') return SubjectType.KANJI
    if (s.object === 'hiragana') return SubjectType.HIRAGANA
    if (s.object === 'katakana') return SubjectType.KATAKANA
    return SubjectType.VOCABULARY
  }

  const type = getSubjectType(subject)

  const colors = {
    [SubjectType.RADICAL]: '!bg-sky-600 text-white',
    [SubjectType.KANJI]: '!bg-pink-600 text-white',
    [SubjectType.HIRAGANA]: '!bg-teal-600 text-white',
    [SubjectType.KATAKANA]: '!bg-amber-600 text-white',
    [SubjectType.VOCABULARY]: '!bg-purple-600 text-white',
  }

  const borderColors = {
    [SubjectType.RADICAL]: 'border-sky-200 bg-sky-50',
    [SubjectType.KANJI]: 'border-pink-200 bg-pink-50',
    [SubjectType.HIRAGANA]: 'border-teal-200 bg-teal-50',
    [SubjectType.KATAKANA]: 'border-amber-200 bg-amber-50',
    [SubjectType.VOCABULARY]: 'border-purple-200 bg-purple-50',
  }

  const handleAiExplain = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (aiExplanation) return

    setLoadingAi(true)
    const explanation = await generateExplanation(subject, type)
    setAiExplanation(explanation)
    setLoadingAi(false)
  }

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
  const character = subject.characters

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

  // Determine if this is a popup/modal view (implied by missing prev/next actions)
  const isPopup = !onNext && !hasNext

  return (
    <div
      className={`w-full max-w-2xl mx-auto p-4 perspective-1000 ${isPopup ? 'h-auto' : ''}`}
      onClick={e => e.stopPropagation()}
    >
      <div
        className={`rounded-2xl shadow-xl bg-white overflow-hidden border border-gray-100 flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Back Header */}
        <div className={`p-6 border-b ${borderColors[type]} relative`}>
          <div className="flex gap-4">
            <div
              className={`hidden sm:flex w-20 h-20 shrink-0 items-center justify-center rounded-xl ${colors[type]} text-4xl font-bold shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}
            >
              {character || (
                <div className="w-12 h-12">
                  {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                    <img
                      src={
                        subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url
                      }
                      alt=""
                      className="w-full h-full brightness-0 invert"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="sm:hidden text-3xl font-bold text-gray-800 mb-2 cursor-pointer">
                {character}
              </div>

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
              <Badge className={colors[type]}>{type}</Badge>

              {subject.level > 0 && (
                <div className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 border border-gray-200 w-fit ml-auto">
                  Lv {subject.level}
                </div>
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

          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Meaning Mnemonic
            </h3>
            <div
              className="text-gray-700 leading-relaxed text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: subject.meaning_mnemonic }}
            />
          </div>

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

          {subject.readings && (
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

          {(type === SubjectType.KANJI || type === SubjectType.RADICAL) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Visuals
              </h3>
              <MnemonicImage id={String(subject.id)} type={type} />
            </div>
          )}

          {components.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {type === SubjectType.VOCABULARY ? 'Kanji Composition' : 'Radicals'}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {components.map(comp => {
                  const compType = getSubjectType(comp)
                  const compChar = comp.characters
                  const compImg = comp.character_images?.find(
                    i => i.content_type === 'image/svg+xml',
                  )?.url
                  return (
                    <div
                      key={comp.id}
                      onClick={() => openFlashcardModal(comp)}
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

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                <Icons.Sparkles className="w-4 h-4" />
                AI Tutor
              </h3>
              {!aiExplanation && (
                <Button variant="outline" size="xs" onClick={handleAiExplain} isLoading={loadingAi}>
                  Ask Gemini
                </Button>
              )}
            </div>

            {aiExplanation && (
              <div className="bg-indigo-50 rounded-lg p-4 text-sm text-gray-700 prose prose-indigo max-w-none">
                <ReactMarkdown>{aiExplanation}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isPopup && (
        <div className="flex justify-between items-center mt-8 px-4">
          <Button
            variant="subtle"
            onClick={e => {
              e.stopPropagation()
              onPrev?.()
            }}
            leftSection={<Icons.ChevronLeft className="w-5 h-5" />}
            disabled={!hasPrev}
            className={clsx('ml-auto', !hasPrev && '!hidden')}
          >
            {hasPrev && !onNext ? 'Back' : 'Prev'}
          </Button>

          <Button
            variant="subtle"
            onClick={e => {
              e.stopPropagation()
              if (onNext) onNext()
            }}
            disabled={!hasNext}
            rightSection={<Icons.ChevronRight className="w-5 h-5" />}
            className={clsx('ml-auto', !hasNext && '!hidden')}
          >
            Next
          </Button>
        </div>
      )}

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
