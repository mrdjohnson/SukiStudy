import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts', 'vitest-localstorage-mock'],
    exclude: [...configDefaults.exclude, 'tests/**/*.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
