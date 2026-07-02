import { Box } from '@mantine/core'
import clsx from 'clsx'
import type { Subject } from '../core/types'
import { useEffect, useMemo, useRef } from 'react'
import { bgColorByType } from '../utils/subject'
import { captureHeroSource } from '../utils/heroTransition'

export const GameItemIcon = ({
  subject,
  size = 'sm',
  'no-animate': noAnimate = false,
}: {
  subject: Subject
  size?: 'lg' | 'sm' | 'xs'
  /** Opt out of the flashcard hero transition (e.g. icons that don't navigate). */
  'no-animate'?: boolean
}) => {
  const color = bgColorByType[subject.object || 'vocabulary']
  const ref = useRef<HTMLDivElement>(null)

  // When this icon lives inside something clickable that opens a flashcard,
  // snapshot the icon on press so it can fly into the card. The capture is
  // discarded if no flashcard opens, so it's harmless on non-navigating rows.
  useEffect(() => {
    if (noAnimate) return

    const el = ref.current
    if (!el) return

    const trigger =
      (el.closest('button, a, [role="button"], .cursor-pointer') as HTMLElement | null) ?? el

    const onPointerDown = () => captureHeroSource(el)
    trigger.addEventListener('pointerdown', onPointerDown, { capture: true })

    return () => trigger.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [noAnimate, subject.id])

  const classes = useMemo(() => {
    if (size === 'xs') {
      return {
        icon: 'size-8 min-w-8 rounded-md',
        small: 'text-xs font-semibold',
        medium: 'text-sm font-semibold',
        large: 'text-lg font-bold',
      }
    }

    if (size === 'sm') {
      return {
        icon: 'h-12 min-w-12 rounded-lg',
        small: 'text-xs font-semibold',
        medium: 'text-sm font-semibold',
        large: 'text-2xl font-bold',
      }
    }

    return {
      icon: 'h-20 min-w-20 rounded-xl',
      small: 'text-xl font-semibold',
      medium: 'text-2xl font-semibold',
      large: 'text-4xl font-bold',
    }
  }, [size])

  return (
    <Box
      ref={ref}
      className={clsx(
        color,
        'flex items-center justify-center font-bold shrink-0 w-fit p-1 text-white dark:text-white/80 flex-col',
        classes.icon,
        classes.large,
        (subject.characters?.length || 0) > 2 && classes.medium,
        (subject.characters?.length || 0) > 4 && classes.small,
      )}
      translate="no"
    >
      {subject.characters || (
        <div className={clsx(classes.icon, 'w-fit')}>
          {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
            <img
              src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url}
              alt=""
              className="w-full h-full brightness-0 invert"
            />
          )}
        </div>
      )}
    </Box>
  )
}
