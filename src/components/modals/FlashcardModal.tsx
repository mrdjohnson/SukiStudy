import { modals } from '@mantine/modals'
import React, { Suspense } from 'react'
import { Subject } from '../../types'

const Flashcard = React.lazy(() => import('../Flashcard').then(m => ({ default: m.Flashcard })))

export const openFlashcardModal = (items: Subject[], index = 0) => {
  modals.open({
    title: null,
    withCloseButton: false,
    padding: 0,
    size: 'lg',
    centered: true,
    children: (
      <div onClick={() => modals.closeAll()}>
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
          <Flashcard items={items} index={index} isPopup />
        </Suspense>
      </div>
    ),
  })
}
