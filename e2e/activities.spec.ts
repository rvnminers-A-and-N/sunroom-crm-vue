import { test, expect } from './fixtures'

test.describe('Activities', () => {
  test('displays activities list', async ({ authenticatedPage: page }) => {
    await page.goto('/activities')
    await expect(page.getByText('Activities')).toBeVisible()
    await expect(page.locator('table, .v-data-table').first()).toBeVisible()
  })

  test('opens the create activity dialog', async ({ authenticatedPage: page }) => {
    await page.goto('/activities')
    await page.getByRole('button', { name: /add|new|create|log/i }).click()
    await expect(page.getByText(/new activity|create activity|log activity/i)).toBeVisible()
  })
})
