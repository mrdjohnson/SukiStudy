import React from 'react'
import { useInternalMessages } from '../../services/internalMessages'
import { Paper, Text, Button, Group, CloseButton, ThemeIcon, Box } from '@mantine/core'
import { Icons } from '../Icons'
import { useNavigate } from 'react-router'
import { Carousel, CarouselSlide } from '@mantine/carousel'
import { openLogModal } from '../modals/LogsModal'
import { InternalMessage } from '../../types'
import clsx from 'clsx'

// Helper to get icon
const getMessageIcon = (type: InternalMessage['type']) => {
  switch (type) {
    case 'new':
      return <Icons.Sparkles size={20} />
    case 'success':
      return <Icons.CheckCircle size={20} />
    case 'warning':
      return <Icons.Help size={20} />
    case 'info':
    default:
      return <Icons.Info size={20} />
  }
}

// Helper for color
const getMessageColor = (type: InternalMessage['type']) => {
  switch (type) {
    case 'new':
      return 'grape'
    case 'success':
      return 'green'
    case 'warning':
      return 'orange'
    case 'info':
    default:
      return 'blue'
  }
}

const DashboardCarouselItem = ({
  message,
  onDismiss,
}: {
  message: InternalMessage
  onDismiss: () => void
}) => {
  const navigate = useNavigate()
  const color = getMessageColor(message.type)

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss()
  }

  if (message.type === 'main') {
    return (
      <Box
        className="bg-linear-to-r saturate-200 from-primary to-secondary via-primary rounded-2xl p-8 px-12 text-white shadow-xl relative overflow-hidden h-full w-full mx-2"
        onDoubleClick={openLogModal}
      >
        <div className="relative z-10 text-white">
          <h1 className="text-3xl font-bold">{message.title}</h1>

          <p className="text-lg mt-2">{message.content}</p>
        </div>

        <div className="absolute right-5 bottom-0 opacity-60 h-full">
          <Icons.BookOpen className="size-full text-primary" />
        </div>

        {/* Dismiss */}
        <CloseButton
          onClick={handleClose}
          size="lg"
          className="absolute! top-4 right-4 text-white!"
          aria-label="Dismiss message"
          variant="transparent"
        />
      </Box>
    )
  }

  return (
    <Paper
      shadow="sm"
      p="md"
      withBorder
      className="my-auto! rounded-2xl! relative overflow-hidden bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 px-6! w-full mx-2"
      style={{
        borderLeft: `4px solid var(--mantine-color-${color}-5)`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon Side */}
        <ThemeIcon size={42} radius="md" variant="light" color={color} className="shrink-0">
          {getMessageIcon(message.type)}
        </ThemeIcon>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <Text
              fw={700}
              size="lg"
              mb={4}
              className="leading-tight text-gray-900 dark:text-gray-100"
            >
              {message.title}
            </Text>

            {/* Dismiss */}
            <CloseButton
              onClick={handleClose}
              size="lg"
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500"
              aria-label="Dismiss message"
            />
          </div>

          <Text size="sm" c="dimmed" mb="md" className="leading-relaxed pr-8">
            {message.content}
          </Text>

          {/* Actions and Navigation */}
          <Group justify="end" align="center" className="mt-2 text-sm">
            {/* Action Button */}
            <div>
              {message.actionLabel && (
                <Button
                  size="xs"
                  variant="light"
                  color={color}
                  onClick={() => {
                    if (message.actionLink) {
                      navigate(message.actionLink)
                    }
                  }}
                  rightSection={<Icons.ChevronRight size={14} />}
                  radius="md"
                >
                  {message.actionLabel}
                </Button>
              )}
            </div>
          </Group>
        </div>
      </div>
    </Paper>
  )
}

export const DashboardMessageCarousel = () => {
  const { messages, dismissMessage } = useInternalMessages()

  if (messages.length === 0) return null

  return (
    <Carousel
      slideGap="md"
      emblaOptions={{ loop: true }}
      withControls={false}
      withIndicators={messages.length > 1}
      classNames={{
        root: clsx(messages.length > 1 && 'pb-12'),
        indicators: 'mt-9! py-2 bg-primary/20 rounded-full',
      }}
    >
      {messages.map(message => (
        <CarouselSlide key={message.id} className="flex">
          <DashboardCarouselItem message={message} onDismiss={() => dismissMessage(message.id)} />
        </CarouselSlide>
      ))}
    </Carousel>
  )
}
