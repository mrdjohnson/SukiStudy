import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './test/setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
