import { Box } from '@mantine/core'
import clsx from 'clsx'
import { useMemo } from 'react'

export const MemoryGameCardContent = ({ content }: { content: string }) => {
  const isContentText = !content.startsWith('http')

  const classes = useMemo(() => {
    return {
      icon: 'h-20 min-w-20 rounded-xl',
      small: 'text-xl font-semibold',
      medium: 'text-2xl font-semibold',
      large: 'text-4xl font-semibold',
    }
  }, [])

  const textSize = useMemo(() => {
    if (content.length > 5) return classes.small
    if (content.length > 3) return classes.medium
    return classes.large
  }, [content])

  return (
    <Box
      className={clsx(
        'flex items-center justify-center font-bold shrink-0 w-fit p-1 text-black',
        classes.icon,
        textSize,
      )}
    >
      {isContentText ? content : <img src={content} className="w-16 h-16 object-contain" alt="" />}
    </Box>
  )
}
