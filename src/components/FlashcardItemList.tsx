import { NavLink } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import type { Subject } from '../core/types'

/**
 * The set of items this card can page through (siblings from the source list, or
 * the related subjects when drilled in). Shown as a permanent sidebar on wide
 * screens and a toggleable slide-over on narrow ones.
 */
export const FlashcardItemList = ({
  items,
  currentIndex,
  onSelect,
}: {
  items: Array<Subject & { label: string }>
  currentIndex: number
  onSelect: (index: number) => void
}) => {
  return (
    <div className="flex h-full flex-col overflow-y-auto no-scrollbar py-2" translate="no">
      {items.map((item, index) => (
        <NavLink
          key={item.id}
          onClick={() => onSelect(index)}
          active={index === currentIndex}
          label={item.label}
          rightSection={<IconChevronRight size={16} />}
        />
      ))}
    </div>
  )
}
