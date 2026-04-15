import { test, expect } from './fixtures'

test.describe('Navigation & Layout', () => {
  test('sidebar contains all main navigation links', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contacts', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Companies', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Deals', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Activities', exact: true })).toBeVisible()
  })

  test('navigates between main sections', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Contacts', exact: true }).click()
    await expect(page).toHaveURL(/\/contacts/)

    await page.getByRole('link', { name: 'Companies', exact: true }).click()
    await expect(page).toHaveURL(/\/companies/)

    await page.getByRole('link', { name: 'Deals', exact: true }).click()
    await expect(page).toHaveURL(/\/deals/)

    await page.getByRole('link', { name: 'Activities', exact: true }).click()
    await expect(page).toHaveURL(/\/activities/)

    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('settings page displays user profile', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Tags', { exact: true })).toBeVisible()
  })

  test('AI panel is accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/ai')
    await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Smart Search' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Summarize' })).toBeVisible()
  })

  test('unknown routes redirect to dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/nonexistent-route')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
