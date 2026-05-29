import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

export const installAppCaching = (
  manifest: Array<string | { url: string; revision?: string | null }>,
) => {
  // Activate new worker versions quickly so push behavior updates with app deploys.
  self.skipWaiting()
  clientsClaim()

  // injectManifest replaces the manifest placeholder with the built app assets.
  precacheAndRoute(manifest)
  cleanupOutdatedCaches()

  // Nitro handles API requests; navigations should fall back to the app shell.
  registerRoute(
    new NavigationRoute(() => fetch('/'), {
      denylist: [/^\/api\//, /^\/_/],
    }),
  )

  // Fonts are stable and expensive to redownload, so keep a long-lived runtime cache.
  registerRoute(
    /\.(?:woff|woff2|eot|ttf|otf)$/,
    new CacheFirst({
      cacheName: 'fonts-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  )

  // Images can be reused across study screens, but the cache is capped to avoid growth.
  registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    new CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  )
}
