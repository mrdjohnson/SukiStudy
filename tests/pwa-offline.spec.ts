import { test, expect } from '@playwright/test'

/**
 * PWA Offline Test Suite
 *
 * This test verifies that the PWA functions correctly offline after entering guest mode.
 * It tests the core PWA functionality:
 * 1. Service worker registration
 * 2. Guest mode activation
 * 3. Offline capability using client-side navigation
 *
 * Note: Full page reload offline requires the service worker to be active.
 * These tests use SPA client-side routing to verify offline functionality.
 */

test.describe('PWA Offline Functionality', () => {
  test('should function offline after entering guest mode and installing PWA', async ({
    page,
    context,
  }) => {
    // Step 1: Navigate to the landing page
    await page.goto('/')

    // Step 2: Wait for the page to be fully loaded
    await expect(page.getByText('SukiStudy', { exact: true }).first()).toBeVisible()

    // Step 3: Click "Enter as Guest" button
    const guestButton = page.getByRole('button', { name: 'Enter as Guest' })
    await expect(guestButton).toBeVisible()
    await guestButton.click()

    // Step 4: Wait for navigation to dashboard and verify guest mode badge
    const guestBadge = page.locator('.mantine-Badge-label', { hasText: 'Guest' })
    await expect(guestBadge).toBeVisible({ timeout: 10000 })

    // Step 5: Wait for service worker to be registered and activated
    const swReady = await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.active?.state === 'activated'
      },
      { timeout: 30000 },
    )
    expect(swReady).toBeTruthy()

    // Step 6: Verify service worker is controlling the page
    const swControlled = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null
    })
    expect(swControlled).toBe(true)

    // Step 7: Give service worker time to cache resources
    await page.waitForTimeout(3000)

    // Step 8: Go offline - the app should detect this via the Network API
    await context.setOffline(true)

    // Step 9: Verify the app detects offline status (Mantine's useNetwork hook)
    const offlineBadge = page.locator('.mantine-Badge-label', { hasText: 'Offline' })
    await expect(offlineBadge).toBeVisible({ timeout: 5000 })

    await page.reload()

    // Step 10: Navigate within the SPA using client-side routing
    await page.getByText('Browse Content').click()

    // Step 11: Verify the browse page loads (from service worker cache)
    await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible()

    // Step 12: Verify offline badge persists
    await expect(offlineBadge).toBeVisible()

    // Step 13: Navigate back to dashboard using browser back
    await page.goBack()

    // Step 14: Verify dashboard still renders while offline
    await expect(page.getByText('Mini Games')).toBeVisible({ timeout: 10000 })
    await expect(guestBadge).toBeVisible()
    await expect(offlineBadge).toBeVisible()

    // Step 15: Go back online and verify recovery
    await context.setOffline(false)

    // Wait for the network change to be detected
    await page.waitForTimeout(1000)

    // Verify offline badge is gone
    await expect(offlineBadge).not.toBeVisible({ timeout: 5000 })
  })

  test('should navigate between pages while offline', async ({ page, context }) => {
    // Enter guest mode first
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as Guest' }).click()

    // Wait for guest badge
    const guestBadge = page.locator('.mantine-Badge-label', { hasText: 'Guest' })
    await expect(guestBadge).toBeVisible({ timeout: 10000 })

    // Wait for service worker to be active
    await page.waitForFunction(
      async () => {
        if (!('serviceWorker' in navigator)) return false
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.active?.state === 'activated'
      },
      { timeout: 30000 },
    )

    // Let service worker cache resources
    await page.waitForTimeout(3000)

    // Navigate to browse page while online to pre-cache it
    await page.getByText('Browse Content').click()
    await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible()

    // Navigate back to dashboard while online
    await page.goBack()
    await expect(page.getByText('Mini Games')).toBeVisible()

    // Now go offline
    await context.setOffline(true)

    // Verify offline detection
    const offlineBadge = page.locator('.mantine-Badge-label', { hasText: 'Offline' })
    await expect(offlineBadge).toBeVisible({ timeout: 5000 })

    // Navigate to browse page while offline (uses SPA client-side routing)
    await page.getByText('Browse Content').click()
    await expect(page.getByRole('heading', { name: 'Browse' })).toBeVisible({ timeout: 10000 })

    // Navigate to games setup while offline
    await page.goBack()
    await expect(page.getByText('Mini Games')).toBeVisible()

    // Click on Mini Games to navigate
    await page.getByText('Play Games').click()

    // Verify the games page loads
    await expect(page.getByRole('heading', { name: /games/i })).toBeVisible({ timeout: 10000 })
  })

  test('should show offline badge when network is disconnected', async ({ page, context }) => {
    // Navigate to dashboard as guest
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as Guest' }).click()

    const guestBadge = page.locator('.mantine-Badge-label', { hasText: 'Guest' })
    await expect(guestBadge).toBeVisible({ timeout: 10000 })

    // Initially should NOT show offline badge
    const offlineBadge = page.locator('.mantine-Badge-label', { hasText: 'Offline' })
    await expect(offlineBadge).not.toBeVisible()

    // Go offline
    await context.setOffline(true)

    // Should now show offline badge
    await expect(offlineBadge).toBeVisible({ timeout: 5000 })

    // Go back online
    await context.setOffline(false)

    // Offline badge should disappear
    await expect(offlineBadge).not.toBeVisible({ timeout: 5000 })
  })
})
