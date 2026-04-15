import { test, expect } from './fixtures'

test.describe('Dashboard', () => {
  test('displays stat cards and pipeline chart after login', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    // Stat cards should be present.
    await expect(page.getByText('Total Contacts')).toBeVisible()
    await expect(page.getByText('Active Deals')).toBeVisible()
    await expect(page.getByText('Pipeline Value')).toBeVisible()
    await expect(page.getByText('Won Revenue')).toBeVisible()
  })

  test('displays the pipeline chart', async ({ authenticatedPage: page }) => {
    await expect(page.locator('canvas').first()).toBeVisible()
  })

  test('displays the recent activity list', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible()
  })
})
