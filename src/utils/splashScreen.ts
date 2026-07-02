/**
 * Boot splash controller.
 *
 * The splash markup + CSS live in index.html so they paint instantly, and a
 * small inline bootstrap there handles the only two things that must happen
 * before first paint: skip the splash on public/landing pages, and (on the app
 * path) lock scroll + paint dark behind it. Everything else — the entry/exit
 * animation, timing and teardown — lives here so the app drives it directly:
 * React imports finishSplash() rather than reaching through a window global.
 */

const SPLASH_ID = 'suki-splash'
const MIN_VISIBLE_MS = 900
const SAFETY_MS = 12000
// Matches the #suki-splash.suki-splash--done transition duration in index.html.
const CLOSE_MS = 800

let splash: HTMLElement | null = null
let startedAt = 0
let finished = false

const setCoverRadius = () => {
  // Distance from the centre to a corner, so the masked circle just covers the
  // screen at rest (and the closing reveal starts immediately).
  const cover = Math.hypot(window.innerWidth, window.innerHeight) / 2
  splash?.style.setProperty('--suki-cover', `${cover}px`)
}

/**
 * Begins the splash entry animation (the ring expands out from the logo). Call
 * once, as early as possible. No-op when the splash isn't present — e.g. on
 * landing pages, where the inline bootstrap already removed it.
 */
export const initSplash = (): void => {
  splash = document.getElementById(SPLASH_ID)
  if (!splash) return

  startedAt = Date.now()
  setCoverRadius()
  window.addEventListener('resize', setCoverRadius)

  // Expand once the initial (small) state has painted.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => splash?.classList.add('suki-splash--enter'))
  })

  // Never let the splash get stuck if readiness never fires.
  window.setTimeout(finishSplash, SAFETY_MS)
}

/**
 * Plays the splash exit — the ring contracts to nothing, revealing the app —
 * then removes it and restores the page. Safe to call more than once; typically
 * called once the databases have initialized. No-op when there's no splash.
 */
export const finishSplash = (): void => {
  if (finished) return
  finished = true

  if (!splash) return

  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt))
  window.setTimeout(() => {
    splash?.classList.add('suki-splash--done')
    window.setTimeout(() => {
      splash?.remove()
      splash = null
      document.documentElement.classList.remove('suki-booting')
      window.removeEventListener('resize', setCoverRadius)
    }, CLOSE_MS + 150)
  }, wait)
}
