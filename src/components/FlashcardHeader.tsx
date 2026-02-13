import React from 'react'
import { Subject, SubjectType } from '../types'
import { Icons } from './Icons'
import { GameItemIcon } from './GameItemIcon'
import { colorByType, themeByType } from '../utils/subject'
import { clsx } from 'clsx'
import { Badge, Stack, ActionIcon } from '@mantine/core'

interface FlashcardHeaderProps {
  subject: Subject
  type: SubjectType
  playAudio: (e: React.MouseEvent) => void
  onClose?: () => void
}

export const FlashcardHeader: React.FC<FlashcardHeaderProps> = ({
  subject,
  type,
  playAudio,
  onClose,
}) => {
  const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning
  const primaryReading = subject.readings?.find(r => r.primary)?.reading

  return (
    <div className={clsx(`p-6 border-b relative`, themeByType[type])}>
      <div className="flex gap-4">
        <GameItemIcon subject={subject} size="lg" />

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white/80 leading-tight mb-2">
            {primaryMeaning}
          </h2>

          {primaryReading && (
            <div className="flex items-center gap-3">
              <span className="text-xl text-gray-600 dark:text-white/80 font-medium">
                {primaryReading}
              </span>
              {subject.pronunciation_audios && subject.pronunciation_audios.length > 0 && (
                <button
                  onClick={playAudio}
                  className="p-1 bg-white/50 hover:bg-white dark:bg-white/70 rounded-full text-indigo-600 transition-colors shadow-sm"
                  title="Play Audio"
                >
                  <Icons.Volume className="size-5" />
                </button>
              )}
            </div>
          )}
        </div>

        <Stack className="absolute top-2 right-2" gap="xs">
          <div className="flex gap-2 justify-end">
            <Badge color={colorByType[type]} className="dark:text-white/80!">
              {type}
            </Badge>

            {onClose && (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={e => {
                  e.stopPropagation()
                  onClose()
                }}
                className="bg-white/20 hover:bg-white/40"
                hiddenFrom="sm"
              >
                <Icons.X size={20} />
              </ActionIcon>
            )}
          </div>

          {subject.level > 0 && (
            <div className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 dark:text-black border border-gray-200 w-fit ml-auto">
              Lv {subject.level}
            </div>
          )}

          {subject.document_url && (
            <a
              href={subject.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/80 px-2 py-1 rounded text-xs font-bold text-gray-500 dark:text-black hover:text-pink-500 hover:border-pink-200 border border-gray-200 w-fit ml-auto flex items-center gap-1 transition-colors"
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
  )
}
