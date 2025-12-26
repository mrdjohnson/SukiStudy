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
        injectRegister: false,
        includeAssets: ['favicon.svg'],

        manifest: {
          name: 'SukiStudy',
          short_name: 'SukiStudy',
          description: 'WaniKani backed Japanese learning app',
          theme_color: '#ff8800',
          background_color: '#ff0000',
          display: 'standalone',
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
              sizes: '192x192',
              src: 'maskable_icon_x192.png',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        workbox: {
          globPatterns: ['**/*'],
          cleanupOutdatedCaches: true,
          disableDevLogs: !isDev,
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
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
