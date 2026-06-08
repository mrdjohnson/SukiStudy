import type { FC } from 'react'
import { Icons } from './Icons'
import { clsx } from 'clsx'
import { ActionIcon } from '@mantine/core'
import { modals } from '@mantine/modals'

interface FlashcardHeaderProps {
  modalId?: string
  onClose?: () => void
}

export const FlashcardHeader: FC<FlashcardHeaderProps> = ({ modalId, onClose }) => {
  return (
    <div className={clsx(`p-2`)}>
      {/* <div className="rounded-full size-20 fixed -translate-x-1/2 -translate-y-1/2 bg-linear-to-br from-white/20 to-transparent -z-10"></div> */}
      {modalId && (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={e => {
            e.stopPropagation()
            onClose?.()
            if (modalId) modals.close(modalId)
          }}
          className="border! border-transparent! border-r-white/20! border-b-white/20!"
          radius="xl"
          hiddenFrom="sm"
        >
          <Icons.X size={14} />
        </ActionIcon>
      )}
      {/* <div className="flex gap-4" translate="no">
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
      </div> */}
    </div>
  )
}
