import { defineConfig } from 'nitro'

export default defineConfig({
  experimental: {
    tasks: true,
  },
  serverDir: './server',
  scheduledTasks: {
    '0 0 * * *': 'notifications:send-due',
  },
})
