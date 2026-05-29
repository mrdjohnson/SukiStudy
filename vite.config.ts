import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import tailwindcss from '@tailwindcss/vite'
import { comlink } from 'vite-plugin-comlink'
import { nitro } from 'nitro/vite'
import vercelPwaLink from './lib/vite-plugin-vercel-pwa-link/plugin'
import moment from 'moment'
import _ from 'lodash'
import { assetFileNames } from './lib/vite-asset-file-names'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

const vendorChunkGroups = [
  ['vendor-react', ['react', 'react-dom', 'react-router', 'react-router-dom']],
  ['vendor-mantine-core', ['@mantine/core', '@mantine/hooks']],
  ['vendor-mantine-charts', ['@mantine/charts', 'recharts']],
  [
    'vendor-mantine-extras',
    ['@mantine/modals', '@mantine/form', '@mantine/carousel', '@mantine/dates', 'dayjs'],
  ],
  [
    'vendor-signals',
    [
      '@signaldb/core',
      '@signaldb/indexeddb',
      '@signaldb/maverickjs',
      '@signaldb/react',
      '@maverick-js/signals',
    ],
  ],
  ['vendor-utils', ['lodash', 'clsx', 'chroma-js']],
] as const

const isNodeModulePackage = (id: string, packageNames: readonly string[]) => {
  const normalizedId = id.split('\\').join('/')

  return packageNames.some(packageName => normalizedId.includes(`/node_modules/${packageName}/`))
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '')
  const isDev = command === 'serve'

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      nitro(),
      react(),
      isDev && mkcert(),
      tailwindcss(),
      comlink(),
      VitePWA({
        mode: 'production',
        base: '/',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'inline',

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

        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          maximumFileSizeToCacheInBytes: 3000000,
        },

        devOptions: {
          enabled: isDev,
          navigateFallback: 'index.html',
          suppressWarnings: !isDev,
          type: 'module',
        },
      }),
      vercelPwaLink(),
    ],
    worker: {
      format: 'es',
      plugins: () => [comlink()], // Enable Comlink for workers
      rolldownOptions: {
        output: {
          assetFileNames,
        },
      },
    },
    define: {
      __BUILD_DATE__: JSON.stringify(moment().format('LL')),
      __BUILD_DATE_LONG__: JSON.stringify(moment().format('LL')),
      __APP_ENV__: JSON.stringify(env.VITE_VERCEL_ENV ?? mode ?? ''),
    },
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: vendorChunkGroups.map(([name, packageNames], index) => ({
              name,
              test: (id: string) => isNodeModulePackage(id, packageNames),
              priority: vendorChunkGroups.length - index,
            })),
          },
          assetFileNames,
        },
      },
    },
  }
})
