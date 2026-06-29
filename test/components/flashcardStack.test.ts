import { afterEach, describe, expect, it, vi } from 'vitest'
import { flashcardStack } from '../../src/components/flashcardStack'
import type { FlashcardCrumb } from '../../src/components/flashcardStack'

const crumb = (id: number): FlashcardCrumb => ({
  id,
  label: `subject-${id}`,
  modalId: String(id),
})

afterEach(() => {
  // Reset to a single throwaway crumb, then truncate it away to empty the trail.
  flashcardStack.reset(crumb(0))
  flashcardStack.truncate(0)
})

describe('flashcardStack', () => {
  it('reset starts a fresh single-level trail', () => {
    flashcardStack.push(crumb(1))
    flashcardStack.push(crumb(2))

    flashcardStack.reset(crumb(9))

    expect(flashcardStack.getSnapshot().map(c => c.id)).toEqual([9])
  })

  it('push adds levels for drill-downs', () => {
    flashcardStack.reset(crumb(1))
    flashcardStack.push(crumb(2))
    flashcardStack.push(crumb(3))

    expect(flashcardStack.getSnapshot().map(c => c.id)).toEqual([1, 2, 3])
  })

  it('update changes a level in place without growing the trail', () => {
    flashcardStack.reset(crumb(1))
    flashcardStack.push(crumb(2))

    flashcardStack.update(1, { id: 5, label: 'paged' })

    const snapshot = flashcardStack.getSnapshot()
    expect(snapshot.map(c => c.id)).toEqual([1, 5])
    expect(snapshot[1].label).toBe('paged')
    expect(snapshot[1].modalId).toBe('2')
  })

  it('truncate drops levels at or beyond a depth', () => {
    flashcardStack.reset(crumb(1))
    flashcardStack.push(crumb(2))
    flashcardStack.push(crumb(3))

    flashcardStack.truncate(1)

    expect(flashcardStack.getSnapshot().map(c => c.id)).toEqual([1])
  })

  it('notifies subscribers and returns a stable snapshot between mutations', () => {
    const listener = vi.fn()
    const unsubscribe = flashcardStack.subscribe(listener)

    flashcardStack.reset(crumb(1))
    const first = flashcardStack.getSnapshot()
    const firstAgain = flashcardStack.getSnapshot()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(first).toBe(firstAgain)

    flashcardStack.push(crumb(2))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(flashcardStack.getSnapshot()).not.toBe(first)

    // No-op update should not emit or replace the snapshot.
    const current = flashcardStack.getSnapshot()
    flashcardStack.update(1, { id: 2, label: 'subject-2' })
    expect(listener).toHaveBeenCalledTimes(2)
    expect(flashcardStack.getSnapshot()).toBe(current)

    unsubscribe()
  })
})
