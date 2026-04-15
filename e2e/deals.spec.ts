import { test, expect } from './fixtures'

test.describe('Deals', () => {
  test('navigates to deals list', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Deals', exact: true }).click()
    await expect(page).toHaveURL(/\/deals/)
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible()
  })

  test('displays the deals data table', async ({ authenticatedPage: page }) => {
    await page.goto('/deals')
    await expect(page.locator('table, .v-data-table').first()).toBeVisible()
  })

  test('opens the create deal dialog', async ({ authenticatedPage: page }) => {
    await page.goto('/deals')
    await page.getByRole('button', { name: /add|new|create/i }).click()
    await expect(page.getByText(/new deal|create deal/i)).toBeVisible()
  })

  test('navigates to pipeline view', async ({ authenticatedPage: page }) => {
    await page.goto('/deals/pipeline')
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()
    // Pipeline should show stage columns.
    await expect(page.getByText('Lead')).toBeVisible()
    await expect(page.getByText('Qualified')).toBeVisible()
  })
})
