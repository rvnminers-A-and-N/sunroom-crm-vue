import { test, expect, TEST_PASSWORD, mockApi } from './fixtures'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await mockApi(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('shows the login form', async ({ page }) => {
    await mockApi(page)
    await page.goto('/auth/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('logs in with valid credentials and reaches dashboard', async ({ page }) => {
    await mockApi(page)
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await mockApi(page, {
      loginResponse: { status: 400, body: { message: 'Invalid credentials' } },
    })
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password', { exact: true }).fill('WrongPass1!')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('.v-alert')).toBeVisible()
  })

  test('navigates to the register page', async ({ page }) => {
    await mockApi(page)
    await page.goto('/auth/login')
    await page.getByRole('link', { name: 'Create one' }).click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })
})
