import { test, expect } from './fixtures'

test.describe('Navigation & Layout', () => {
  test('sidebar contains all main navigation links', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /companies/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /deals/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /activities/i })).toBeVisible()
  })

  test('navigates between main sections', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /contacts/i }).first().click()
    await expect(page).toHaveURL(/\/contacts/)

    await page.getByRole('link', { name: /companies/i }).first().click()
    await expect(page).toHaveURL(/\/companies/)

    await page.getByRole('link', { name: /deals/i }).first().click()
    await expect(page).toHaveURL(/\/deals/)

    await page.getByRole('link', { name: /activities/i }).first().click()
    await expect(page).toHaveURL(/\/activities/)

    await page.getByRole('link', { name: /dashboard/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('settings page displays user profile', async ({ authenticatedPage: page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Settings')).toBeVisible()
    await expect(page.getByText('Tags')).toBeVisible()
  })

  test('AI panel is accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/ai')
    await expect(page.getByText('AI Assistant')).toBeVisible()
    await expect(page.getByText('Smart Search')).toBeVisible()
    await expect(page.getByText('Summarize')).toBeVisible()
  })

  test('unknown routes redirect to dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/nonexistent-route')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
