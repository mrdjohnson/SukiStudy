import { Box } from '@mantine/core'
import clsx from 'clsx'
import { Subject } from '../types'
import { useMemo } from 'react'
import { bgColorByType } from '../utils/subject'

export const GameItemIcon = ({
  subject,
  size = 'sm',
}: {
  subject: Subject
  size?: 'lg' | 'sm'
}) => {
  const color = bgColorByType[subject.object || 'vocabulary']

  const classes = useMemo(() => {
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
      className={clsx(
        color,
        'flex items-center justify-center font-bold shrink-0 w-fit p-1 text-white',
        classes.icon,
        classes.large,
        (subject.characters?.length || 0) > 2 && classes.medium,
        (subject.characters?.length || 0) > 4 && classes.small,
      )}
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
