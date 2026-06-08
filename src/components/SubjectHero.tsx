import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@mantine/core'
import { IconPlayerPlay } from '@tabler/icons-react'
import clsx from 'clsx'

import type { Subject } from '../core/types'
import { toRomanji } from '../utils/kana'

export const SubjectHero = ({ subject, onClick }: { subject: Subject; onClick?: () => void }) => {
  const [audioIndex, setAudioIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { primaryMeaning, reading, hasAudio } = useMemo(() => {
    const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning
    const primaryReading = subject.readings?.find(r => r.primary)?.reading
    const hasAudio = !!subject.pronunciation_audios?.[0]
    const anyReading = subject.readings?.[0].reading

    return { primaryMeaning, reading: primaryReading || anyReading, hasAudio }
  }, [subject])

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!hasAudio) return

    const audios = subject.pronunciation_audios || []

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

  useEffect(() => {
    setAudioIndex(0)
  }, [subject?.id])

  return (
    <>
      <div className="hero-glow transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-4 dark">
          {primaryMeaning}
        </span>

        <h1
          className={clsx(
            'font-japanese text-center leading-tight text-white font-extrabold text-on-primary-container tracking-wide mb-2 drop-shadow-lg text-shadow-[2px_2px_2px_rgba(0,0,0,0.5)]! text-shadow-black!',
            subject.characters && subject.characters.length > 5 ? 'text-5xl!' : 'text-6xl!',
            onClick && 'cursor-pointer',
          )}
          translate="no"
          onClick={onClick}
        >
          {subject.characters}
        </h1>

        {reading && (
          <Button
            variant="transparent"
            color="gray"
            className={clsx(
              'flex items-center space-x-3 mt-2 bg-black/50! px-4 py-2 rounded-full backdrop-blur-md shadow-xs! shadow-white/20 text-white!',
              !hasAudio && 'pointer-events-none cursor-default!',
              !reading && 'hidden',
            )}
            rightSection={hasAudio && <IconPlayerPlay size={14} />}
            translate="no"
            radius="xl"
            onClick={playAudio}
          >
            {toRomanji(reading)}
          </Button>
        )}
      </div>
    </>
  )
}
