import { modals } from '@mantine/modals'
import { Flashcard } from '../Flashcard'
import { Subject } from '../../types'

export const openFlashcardModal = (items: Subject[], index = 0) => {
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
        <Flashcard items={items} index={index} isPopup />
      </div>
    ),
  })
}
