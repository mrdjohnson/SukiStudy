import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { comlink } from 'vite-plugin-comlink'
import vercel from 'vite-plugin-vercel'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      isDev && mkcert(),
      tailwindcss(),
      comlink(),
      vercel(),
      VitePWA({
        mode: 'production',
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon-512x512.png'],

        manifest: {
          name: 'SukiStudy',
          short_name: 'SukiStudy',
          description: 'WaniKani backed Japanese learning app',
          theme_color: '#ff0000',
          background_color: '#ff0000',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },

        workbox: {
          globPatterns: ['**/*'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          disableDevLogs: !isDev,

          runtimeCaching: [
            {
              // Image caching
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              // Cache requests for image file extensions

              handler: 'CacheFirst',
              // Images don't change often, so prioritize cache

              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                  // 30 days
                },
              },
            },
          ],
        },

        devOptions: {
          enabled: isDev,
          navigateFallback: 'index.html',
          suppressWarnings: !isDev,
          type: 'module',
        },
      }),
      tsconfigPaths(),
    ],
    worker: {
      plugins: () => [comlink()], // Enable Comlink for workers
    },
    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __APP_ENV__: process.env.VITE_VERCEL_ENV,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  }
})
