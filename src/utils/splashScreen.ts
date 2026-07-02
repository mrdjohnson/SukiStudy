/**
 * Dismisses the initial HTML splash screen defined in index.html.
 *
 * The splash owns its own minimum-visible timing and exit animation; this just
 * signals that the app is ready (typically once the databases have initialized).
 * Safe to call multiple times and before the splash script has registered — the
 * first effective call wins, later ones are ignored.
 */
export function finishSplash(): void {
  if (typeof window === 'undefined') return

  const finish = (window as unknown as { __sukiSplashFinish?: () => void }).__sukiSplashFinish
  finish?.()
}
