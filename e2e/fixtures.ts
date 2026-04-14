import { test as base, expect } from '@playwright/test'

/** Default test user credentials (must exist in the backend test seed). */
export const TEST_USER = {
  email: 'ada@example.com',
  password: 'Password1!',
  name: 'Ada Lovelace',
}

export const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'Password1!',
  name: 'Admin User',
}

/**
 * Extended test fixture that provides an authenticated page.
 * Logs in via the UI before each test, then stores the token in
 * localStorage so subsequent navigations stay authenticated.
 */
export const test = base.extend<{ authenticatedPage: ReturnType<typeof base['page']> }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/dashboard')
    await use(page)
  },
})

export { expect }
