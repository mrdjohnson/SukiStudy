import React from 'react'
import { modals } from '@mantine/modals'
import { Flashcard } from '../Flashcard'
import { Subject, Assignment } from '../../types'

export const openFlashcardModal = (subject: Subject, assignment?: Assignment) => {
  modals.open({
    title: null,
    withCloseButton: false,
    padding: 0,
    size: 'lg',
    centered: true,
    styles: {
      content: { backgroundColor: 'transparent', boxShadow: 'none' },
      body: { backgroundColor: 'transparent' },
    },
    children: (
      <div onClick={() => modals.closeAll()}>
        <Flashcard
          subject={subject}
          assignment={assignment}
          hasPrev={false}
          hasNext={false}
        />
      </div>
    ),
  })
}
