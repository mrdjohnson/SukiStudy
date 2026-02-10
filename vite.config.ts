import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { comlink } from 'vite-plugin-comlink'
import vercel from 'vite-plugin-vercel'
import vercelPwaLink from './lib/vite-plugin-vercel-pwa-link/plugin'
import moment from 'moment'
import _ from 'lodash'
import { assetFileNames } from './lib/vite-asset-file-names'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    base: '/',
    scope: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      isDev && mkcert(),
      tailwindcss(),
      comlink(),
      VitePWA({
        mode: 'production',
        base: '/',
        scope: '/',
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['**/*'],

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
          globPatterns: ['**/*', '!**/*.{woff,woff2,eot,ttf,otf}'],
          // Exclude fonts from precache
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          disableDevLogs: !isDev,
          maximumFileSizeToCacheInBytes: 3000000,

          runtimeCaching: [
            {
              // Font caching
              urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
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
      vercel(),
      // vercelPwaLink(),
    ],
    worker: {
      format: 'es',
      plugins: () => [comlink()], // Enable Comlink for workers
      rollupOptions: {
        output: {
          assetFileNames,
        },
      },
    },
    workbox: {
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: '/index.html',
    },
    define: {
      __BUILD_DATE__: JSON.stringify(moment().format('LL')),
      __APP_ENV__: process.env.VITE_VERCEL_ENV,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom'],
            'vendor-mantine-core': ['@mantine/core', '@mantine/hooks'],
            'vendor-mantine-charts': ['@mantine/charts', 'recharts'],
            'vendor-mantine-extras': [
              '@mantine/modals',
              '@mantine/form',
              '@mantine/carousel',
              '@mantine/dates',
              'dayjs',
            ],
            'vendor-signals': [
              '@signaldb/core',
              '@signaldb/indexeddb',
              '@signaldb/maverickjs',
              '@signaldb/react',
              '@maverick-js/signals',
            ],
            'vendor-utils': ['lodash', 'clsx', 'chroma-js'],
          },
          assetFileNames,
        },
      },
    },
  }
})
