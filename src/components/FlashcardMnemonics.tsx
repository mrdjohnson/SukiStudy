import React, { useEffect, useRef, useState } from 'react'
import { Box, SegmentedControl, Stack, Text } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import { IconBulb } from '@tabler/icons-react'
import Markdown from 'react-markdown'
import type { Subject } from '../core/types'

/**
 * Meaning / reading mnemonics as a swipeable pair of slides with a segmented
 * control. Mount with a key on subject.id so the tab + scroll reset per card.
 */
export const FlashcardMnemonics = ({ subject }: { subject: Subject }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState('meaning')
  const { ref: meaningSlideRef, height: meaningHeight } = useElementSize()
  const { ref: readingSlideRef, height: readingHeight } = useElementSize()

  useEffect(() => {
    if (!scrollRef.current) return
    const index = tab === 'meaning' ? 0 : 1
    const slideWidth = scrollRef.current.offsetWidth
    scrollRef.current.scrollTo({ left: index * slideWidth, behavior: 'smooth' })
  }, [tab])

  const handleScrollEnd = (e: React.UIEvent<HTMLDivElement>) => {
    const width = e.currentTarget.offsetWidth
    if (width === 0) return
    const index = Math.round(e.currentTarget.scrollLeft / width)
    const newTab = index === 0 ? 'meaning' : 'reading'
    if (newTab !== tab) setTab(newTab)
  }

  return (
    <section>
      <Stack mb="xs">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
          <IconBulb size={14} /> Mnemonics
        </h3>

        {subject.reading_mnemonic && (
          <SegmentedControl
            size="xs"
            radius="xl"
            value={tab}
            onChange={setTab}
            data={[
              { label: 'Meaning', value: 'meaning' },
              { label: 'Reading', value: 'reading' },
            ]}
            className="bg-black/30! p-2! backdrop-blur-sm"
          />
        )}
      </Stack>

      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out backdrop-blur-sm p-4 rounded-xl bg-black/30"
        style={{
          height: tab === 'meaning' ? (meaningHeight || 0) + 30 : (readingHeight || 0) + 30,
        }}
      >
        <div
          ref={scrollRef}
          onScrollEnd={handleScrollEnd}
          className="flex items-start overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar scroll-smooth gap-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Meaning Slide */}
          <div className="w-full shrink-0 snap-start">
            <div ref={meaningSlideRef}>
              <Stack gap="md">
                <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                  {subject.isKana ? (
                    <Markdown>{subject.meaning_mnemonic}</Markdown>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: subject.meaning_mnemonic }} />
                  )}
                </div>

                {subject.meaning_hint && (
                  <Box className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                      Hint
                    </Text>
                    <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                      <div dangerouslySetInnerHTML={{ __html: subject.meaning_hint }} />
                    </div>
                  </Box>
                )}
              </Stack>
            </div>
          </div>

          {/* Reading Slide */}
          {!!subject.reading_mnemonic && (
            <div className="w-full shrink-0 snap-start">
              <div ref={readingSlideRef}>
                <Stack gap="md">
                  <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                    <div dangerouslySetInnerHTML={{ __html: subject.reading_mnemonic }} />
                  </div>
                  {subject.reading_hint && (
                    <Box className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                        Hint
                      </Text>
                      <div className="prose prose-spacing dark:prose-invert max-w-none text-sm">
                        <div dangerouslySetInnerHTML={{ __html: subject.reading_hint }} />
                      </div>
                    </Box>
                  )}
                </Stack>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
