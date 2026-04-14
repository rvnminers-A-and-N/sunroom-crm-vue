import { test, expect, TEST_ADMIN } from './fixtures'

test.describe('Admin', () => {
  test('non-admin users are redirected away from admin page', async ({ authenticatedPage: page }) => {
    await page.goto('/admin')
    // The router guard redirects non-admins to dashboard.
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('admin users can access user management', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(TEST_ADMIN.email)
    await page.getByLabel('Password').fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/dashboard')
    await page.goto('/admin')
    await expect(page.getByText('User Management')).toBeVisible()
  })
})
