/**
 * Shared-element ("hero") transition for opening the flashcard.
 *
 * The source element (a dashboard SubjectHero, or a GameItemIcon in a list) and
 * the destination (the SubjectHero inside the freshly-opened flashcard modal)
 * are different DOM nodes that never exist together, so we can't use a plain
 * CSS transition. Instead we snapshot the source on click, then — once the
 * flashcard mounts — fly a cloned "ghost" of it from the source position into
 * the destination while the real hero cross-fades in and the card appears
 * around it (FLIP: First/Last/Invert/Play).
 */

type PendingSource = {
  rect: DOMRect
  ghost: HTMLElement
  capturedAt: number
}

let pending: PendingSource | null = null

// A capture is only valid for the flashcard opened by the same interaction. If
// no flashcard mounts shortly after (e.g. the click did something else), the
// snapshot is discarded rather than animating a later, unrelated open.
const MAX_AGE_MS = 1000
const DURATION_MS = 480
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Snapshot `el` so it can fly into the next flashcard that opens. Call this
 * synchronously from the same click/pointer handler that opens the flashcard.
 */
export const captureHeroSource = (el: HTMLElement | null | undefined) => {
  if (!el || prefersReducedMotion()) {
    pending = null
    return
  }

  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    pending = null
    return
  }

  const ghost = el.cloneNode(true) as HTMLElement
  pending = { rect, ghost, capturedAt: Date.now() }
}

/**
 * Morph the most-recently captured source element into `destEl` (the flashcard
 * hero). No-op when there's no fresh capture, so programmatic opens fall back to
 * a plain modal.
 *
 * When opening a stacked (child) flashcard, the modal's content may not be laid
 * out yet on the first frame, so `destEl` can measure as 0×0. Rather than
 * discarding the capture, we peek without consuming and retry on the next frame
 * until the destination has a size (or the capture ages out) — then commit.
 */
export const playHeroTransition = (destEl: HTMLElement | null | undefined, attempt = 0) => {
  if (!destEl) return

  // Peek — don't consume until we know we can actually animate.
  const source = pending
  if (!source) return
  if (Date.now() - source.capturedAt > MAX_AGE_MS) {
    pending = null
    return
  }

  const srcRect = source.rect
  const destRect = destEl.getBoundingClientRect()
  if (!destRect.width || !destRect.height || !srcRect.width) {
    if (attempt < 12) {
      requestAnimationFrame(() => playHeroTransition(destEl, attempt + 1))
    } else {
      pending = null
    }
    return
  }

  // Destination is ready — commit the capture.
  pending = null

  const ghost = source.ghost
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${srcRect.left}px`,
    top: `${srcRect.top}px`,
    width: `${srcRect.width}px`,
    height: `${srcRect.height}px`,
    margin: '0',
    zIndex: '100000',
    pointerEvents: 'none',
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
  } satisfies Partial<CSSStyleDeclaration>)
  document.body.appendChild(ghost)

  // Align centres and match the destination width; the ghost fades out as it
  // lands so a slight height mismatch (e.g. a small icon → tall hero) is hidden.
  const dx = destRect.left + destRect.width / 2 - (srcRect.left + srcRect.width / 2)
  const dy = destRect.top + destRect.height / 2 - (srcRect.top + srcRect.height / 2)
  const scale = destRect.width / srcRect.width

  // Hide the real hero up front, then cross-fade it in as the ghost arrives.
  destEl.style.opacity = '0'

  const ghostAnim = ghost.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0, offset: 1 },
    ],
    { duration: DURATION_MS, easing: EASING, fill: 'forwards' },
  )

  const destAnim = destEl.animate(
    [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.45 },
      { opacity: 1, offset: 1 },
    ],
    { duration: DURATION_MS, easing: EASING, fill: 'forwards' },
  )

  const cleanup = () => {
    ghost.remove()
    destEl.style.opacity = ''
    destAnim.cancel()
  }
  ghostAnim.finished.then(cleanup, cleanup)
}
