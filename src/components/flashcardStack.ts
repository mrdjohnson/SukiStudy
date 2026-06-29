/**
 * Shared, reactive breadcrumb trail for stacked flashcard modals.
 *
 * Drilling into a related subject (composition / similar / vocabulary) opens a
 * new flashcard modal on top of the current one. Because each modal is opened
 * imperatively via `modals.open`, they can't share React state directly, so we
 * keep the trail in this tiny external store and subscribe to it with
 * `useSyncExternalStore`. Each open modal renders the slice of the trail up to
 * its own depth, which lets us show breadcrumbs and turn the close button into a
 * "back" affordance when there's a parent to return to.
 */
export type FlashcardCrumb = {
  /** The currently displayed subject id at this depth (updates as you page). */
  id: number
  /** Short, recognizable label shown in the breadcrumb. */
  label: string
  /** The Mantine modal id for this depth, used to close it when navigating. */
  modalId: string
}

let crumbs: FlashcardCrumb[] = []
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

export const flashcardStack = {
  subscribe(listener: () => void) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot() {
    return crumbs
  },

  /** Start a fresh trail (a top-level flashcard open). */
  reset(crumb: FlashcardCrumb) {
    crumbs = [crumb]
    emit()
  },

  /** Add a level when drilling into a related subject. */
  push(crumb: FlashcardCrumb) {
    crumbs = [...crumbs, crumb]
    emit()
  },

  /** Reflect the currently displayed subject for a level as the user pages. */
  update(depth: number, crumb: Partial<FlashcardCrumb>) {
    const existing = crumbs[depth]
    if (!existing) return

    const next = { ...existing, ...crumb }
    if (existing.id === next.id && existing.label === next.label) return

    crumbs = crumbs.map((value, index) => (index === depth ? next : value))
    emit()
  },

  /** Drop every level at or beyond a depth (a level's modal closed). */
  truncate(depth: number) {
    if (crumbs.length <= depth) return

    crumbs = crumbs.slice(0, depth)
    emit()
  },
}
