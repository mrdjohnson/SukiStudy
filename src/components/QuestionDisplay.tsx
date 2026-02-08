import React, { useMemo } from 'react'
import clsx from 'clsx'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'

import { Subject, SubjectType } from '../types'
import { bgColorByType, colorByType, textColorByType } from '../utils/subject'
import { openFlashcardModal } from './modals/FlashcardModal'
import { ActionIcon, Center, Group, Paper, SimpleGrid } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'

type QuestionDisplayProps = {
  subject: Subject
  /**
   * Optional override for the main display content.
   * If not provided, uses subject.characters or subject.character_images
   */
  question?: string
  /**
   * Whether to show the "REVIEW" badge
   */
  isReviewable?: boolean
  /**
   * Whether interaction is enabled (e.g. only after answering)
   */
  isInteractionEnabled?: boolean
  /**
   * Custom content to render instead of the default character/question
   * Useful for audio game or other special types
   */
  customContent?: React.ReactNode
  className?: string
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  subject,
  question,
  isReviewable,
  isInteractionEnabled = false,
  customContent,
  className,
}) => {
  const { availableFonts } = useSettings()

  const fontStyle = useMemo(() => {
    if (availableFonts.length === 0) return {}

    const font = _.sample(availableFonts)

    return font ? { fontFamily: font.family } : { fontWeight: 'bold' }
  }, [availableFonts, subject])

  const renderMainContent = () => {
    if (customContent) return customContent

    if (question) return <span style={fontStyle}>{question}</span>

    if (subject.characters) {
      return <span style={fontStyle}>{subject.characters}</span>
    }

    // Fallback to image if no characters (e.g. some radicals)
    if (subject.character_images && subject.character_images.length > 0) {
      return (
        <img
          src={subject.character_images[0].url}
          className="w-16 h-16 mx-auto object-contain dark:invert"
          alt="Subject character"
        />
      )
    }

    return '?'
  }

  const subjectType = subject.object || SubjectType.VOCABULARY

  const infoText = useMemo(() => {
    if (subjectType === SubjectType.RADICAL) return subject.meanings[0].meaning

    const meaning = subject.meanings[0]?.meaning

    const reading = subject.readings?.[0]?.reading

    return [meaning, reading].join(' • ')
  }, [])

  return (
    <Paper
      className={clsx(
        'text-center relative rounded-2xl pb-8 mb-12 h-48 dark:bg-black/30!',
        isInteractionEnabled && 'shadow-lg cursor-pointer group',
        className,
      )}
      onClick={e => {
        if (!isInteractionEnabled) return

        e.stopPropagation()
        openFlashcardModal([subject])
      }}
      withBorder
      shadow="md"
    >
      <SimpleGrid cols={3} className="pb-4 px-2">
        {/* Review Badge - Top Left */}
        <Group>
          {isReviewable && (
            <div className="bg-yellow-400 dark:bg-yellow-600 text-black dark:text-gray-200 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm z-10 uppercase tracking-wider w-fit">
              REVIEW
            </div>
          )}
        </Group>

        {/* Type Badge - Top Right */}
        <Center>
          <div
            className={clsx(
              'm-2 text-white dark:text-gray-100 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm z-10 uppercase tracking-wider w-fit',
              bgColorByType[subjectType],
            )}
          >
            {subject.object}
          </div>
        </Center>

        {isInteractionEnabled && (
          <Group className="flex-row-reverse!">
            <ActionIcon
              variant="transparent"
              color={colorByType[subjectType]}
              className="group-hover:scale-130 [.group:has(.suppress-card-hover:hover)_&]:!scale-100 transition-transform"
            >
              <IconExternalLink />
            </ActionIcon>
          </Group>
        )}
      </SimpleGrid>

      {/* Main Content Area */}
      <div className="relative inline-block group">
        {/* Content */}
        <div
          onClick={() => isInteractionEnabled && openFlashcardModal([subject])}
          className={clsx(
            'transition-all duration-300 select-none',
            customContent ? '' : 'text-6xl md:text-7xl', // Default size for text
            isInteractionEnabled && [
              textColorByType[subjectType],
              ' cursor-pointer scale-110 hover:scale-115',
              !customContent && 'underline decoration-dotted underline-offset-12',
            ],
          )}
          title={isInteractionEnabled ? 'Click to view details' : ''}
        >
          {renderMainContent()}
        </div>
      </div>

      {/* Info Text (Meaning/Reading) */}
      <div
        className={clsx(
          'h-8 mt-4 text-lg font-medium transition-all duration-500',
          isInteractionEnabled
            ? 'opacity-70 transform translate-y-0'
            : 'opacity-0 transform -translate-y-2',
        )}
      >
        {infoText}
      </div>
    </Paper>
  )
}
