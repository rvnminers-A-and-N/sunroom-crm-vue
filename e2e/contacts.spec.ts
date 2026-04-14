import { test, expect } from './fixtures'

test.describe('Contacts', () => {
  test('navigates to contacts list from sidebar', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /contacts/i }).first().click()
    await expect(page).toHaveURL(/\/contacts/)
    await expect(page.getByText('Contacts')).toBeVisible()
  })

  test('displays the contacts data table', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts')
    await expect(page.locator('table, .v-data-table').first()).toBeVisible()
  })

  test('opens the create contact dialog', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts')
    await page.getByRole('button', { name: /add|new|create/i }).click()
    await expect(page.getByText(/new contact|create contact/i)).toBeVisible()
  })

  test('creates a new contact', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts')
    await page.getByRole('button', { name: /add|new|create/i }).click()
    await page.getByLabel('First Name').fill('E2E')
    await page.getByLabel('Last Name').fill('TestContact')
    await page.getByLabel('Email').fill(`e2e-${Date.now()}@test.com`)
    await page.getByRole('button', { name: /save|create|submit/i }).click()
    await expect(page.getByText('E2E')).toBeVisible({ timeout: 10_000 })
  })

  test('navigates to contact detail page', async ({ authenticatedPage: page }) => {
    await page.goto('/contacts')
    // Click the first contact row link.
    await page.locator('table tbody tr, .v-data-table tbody tr').first().click()
    await expect(page).toHaveURL(/\/contacts\/\d+/)
  })
})
