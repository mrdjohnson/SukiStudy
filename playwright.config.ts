import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for PWA offline testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Production build URL (run `yarn preview` first)
    baseURL: 'http://localhost:4174',

    // Capture trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable service workers for PWA testing
        serviceWorkers: 'allow',
      },
    },
  ],

  // Run the preview server before tests
  webServer: {
    command: 'yarn preview',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
