import { modals } from '@mantine/modals'
import React, { Suspense, useEffect } from 'react'
import { useMatches } from '@mantine/core'
import { Subject } from '../../types'

const Flashcard = React.lazy(() => import('../Flashcard').then(m => ({ default: m.Flashcard })))

const FlashcardModalWrapper: React.FC<{ items: Subject[]; index: number }> = ({ items, index }) => {
  const modalId = items[index].id.toString()
  const isMobile = useMatches({ base: true, xs: false })

  useEffect(() => {
    modals.updateModal({
      modalId,
      fullScreen: isMobile,
      withCloseButton: false,
    })
  }, [modalId, isMobile])

  return (
    <div onClick={() => modals.close(modalId)} className="h-full mx-auto my-auto">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <Flashcard items={items} index={index} modalId={modalId} />
      </Suspense>
    </div>
  )
}

export const openFlashcardModal = (items: Subject[], index = 0) => {
  modals.open({
    modalId: items[index].id.toString(),
    title: null,
    withCloseButton: false,
    padding: 0,
    size: 'lg',
    centered: true,
    children: <FlashcardModalWrapper items={items} index={index} />,
    classNames: { body: 'max-h-full overflow-hidden', content: 'flex!' },
  })
}
