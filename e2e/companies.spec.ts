import { test, expect } from './fixtures'

test.describe('Companies', () => {
  test('displays companies list', async ({ authenticatedPage: page }) => {
    await page.goto('/companies')
    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()
    await expect(page.locator('table, .v-data-table').first()).toBeVisible()
  })

  test('opens the create company dialog', async ({ authenticatedPage: page }) => {
    await page.goto('/companies')
    await page.getByRole('button', { name: /add|new|create/i }).click()
    await expect(page.getByText(/new company|create company/i)).toBeVisible()
  })

  test('navigates to company detail page', async ({ authenticatedPage: page }) => {
    await page.goto('/companies')
    await page.locator('table tbody tr, .v-data-table tbody tr').first().click()
    await expect(page).toHaveURL(/\/companies\/\d+/)
  })
})
