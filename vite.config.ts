import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    base: '/SukiStudy/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      isDev && mkcert(),
      tailwindcss(),
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
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  }
})
