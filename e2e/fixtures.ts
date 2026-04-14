import type { Page, Route } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

// ----- Mock users -----

export const TEST_USER = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'User',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
}

export const TEST_ADMIN = {
  id: 99,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'Admin',
  avatarUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
}

export const TEST_PASSWORD = 'Password1!'

// ----- Mock data -----

const sampleContacts = [
  {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@acme.test',
    phone: '555-1111',
    title: 'CEO',
    companyName: 'Acme Inc',
    companyId: 1,
    lastContactedAt: '2024-06-01T00:00:00Z',
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@globex.test',
    phone: '555-2222',
    title: 'CTO',
    companyName: 'Globex',
    companyId: 2,
    lastContactedAt: '2024-06-02T00:00:00Z',
    tags: [],
    createdAt: '2024-01-02T00:00:00Z',
  },
]

const sampleCompanies = [
  {
    id: 1,
    name: 'Acme Inc',
    industry: 'Technology',
    website: 'https://acme.test',
    phone: '555-9999',
    city: 'San Francisco',
    state: 'CA',
    contactCount: 3,
    dealCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
]

const sampleDeals = [
  {
    id: 1,
    title: 'Enterprise Deal',
    value: 50000,
    stage: 'Lead',
    contactName: 'Jane Doe',
    contactId: 1,
    companyName: 'Acme Inc',
    companyId: 1,
    expectedCloseDate: '2024-12-31',
    closedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
  },
]

const samplePipeline = {
  stages: [
    { stage: 'Lead', count: 1, totalValue: 50000, deals: [sampleDeals[0]] },
    { stage: 'Qualified', count: 0, totalValue: 0, deals: [] },
    { stage: 'Proposal', count: 0, totalValue: 0, deals: [] },
    { stage: 'Negotiation', count: 0, totalValue: 0, deals: [] },
    { stage: 'Won', count: 0, totalValue: 0, deals: [] },
    { stage: 'Lost', count: 0, totalValue: 0, deals: [] },
  ],
}

const sampleActivities = [
  {
    id: 1,
    type: 'Call',
    subject: 'Quarterly check-in',
    body: 'Discussed expansion plans',
    aiSummary: null,
    contactId: 1,
    contactName: 'Jane Doe',
    dealId: null,
    dealTitle: null,
    userName: 'Ada Lovelace',
    occurredAt: '2024-06-01T10:00:00Z',
    createdAt: '2024-06-01T10:00:00Z',
  },
]

const sampleDashboard = {
  totalContacts: 12,
  totalCompanies: 5,
  totalDeals: 7,
  totalPipelineValue: 250000,
  wonRevenue: 100000,
  dealsByStage: [
    { stage: 'Lead', count: 3, totalValue: 30000 },
    { stage: 'Qualified', count: 2, totalValue: 20000 },
    { stage: 'Won', count: 1, totalValue: 10000 },
  ],
  recentActivities: [
    {
      id: 1,
      type: 'Call',
      subject: 'Quarterly check-in',
      contactName: 'Jane Doe',
      userName: 'Ada Lovelace',
      occurredAt: '2024-06-01T10:00:00Z',
    },
  ],
}

// ----- Route helpers -----

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function paginated<T>(items: T[]) {
  return {
    data: items,
    meta: { currentPage: 1, perPage: 20, total: items.length, lastPage: 1 },
  }
}

export interface ApiOverrides {
  loginResponse?: { status: number; body: unknown }
  registerResponse?: { status: number; body: unknown }
  meUser?: typeof TEST_USER | typeof TEST_ADMIN
}

/**
 * Intercepts all backend API requests via `page.route()` so E2E tests are
 * fully deterministic and never need a running backend.
 */
export async function mockApi(page: Page, overrides: ApiOverrides = {}) {
  const meUser = overrides.meUser ?? TEST_USER

  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const fullUrl = req.url()
    const path = fullUrl.split('/api')[1]?.split('?')[0] ?? ''
    const method = req.method()

    // ----- Auth -----
    if (path === '/auth/login' && method === 'POST') {
      if (overrides.loginResponse) {
        return json(route, overrides.loginResponse.body, overrides.loginResponse.status)
      }
      return json(route, { token: 'fake-token', user: meUser })
    }
    if (path === '/auth/register' && method === 'POST') {
      if (overrides.registerResponse) {
        return json(route, overrides.registerResponse.body, overrides.registerResponse.status)
      }
      return json(route, { token: 'fake-token', user: meUser })
    }
    if (path === '/auth/me' && method === 'GET') {
      return json(route, meUser)
    }
    if (path === '/auth/logout' && method === 'POST') {
      return json(route, { ok: true })
    }

    // ----- Dashboard -----
    if (path === '/dashboard' && method === 'GET') {
      return json(route, sampleDashboard)
    }

    // ----- Contacts -----
    if (path === '/contacts' && method === 'GET') {
      return json(route, paginated(sampleContacts))
    }
    if (/^\/contacts\/\d+$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2])
      const c = sampleContacts.find((x) => x.id === id) ?? sampleContacts[0]
      return json(route, {
        ...c,
        notes: null,
        updatedAt: '2024-06-02T00:00:00Z',
        company: null,
        deals: [],
        activities: [],
      })
    }
    if (path === '/contacts' && method === 'POST') {
      return json(route, { ...sampleContacts[0], id: 999 })
    }
    if (/^\/contacts\/\d+$/.test(path) && method === 'PUT') {
      return json(route, sampleContacts[0])
    }
    if (/^\/contacts\/\d+\/tags$/.test(path) && method === 'PUT') {
      return json(route, sampleContacts[0])
    }
    if (/^\/contacts\/\d+$/.test(path) && method === 'DELETE') {
      return route.fulfill({ status: 204, body: '' })
    }

    // ----- Companies -----
    if (path === '/companies' && method === 'GET') {
      return json(route, paginated(sampleCompanies))
    }
    if (/^\/companies\/\d+$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2])
      const c = sampleCompanies.find((x) => x.id === id) ?? sampleCompanies[0]
      return json(route, {
        ...c,
        address: '123 Market St',
        zip: '94105',
        notes: null,
        updatedAt: '2024-06-02T00:00:00Z',
        contacts: [],
        deals: [],
      })
    }
    if (path === '/companies' && method === 'POST') {
      return json(route, { ...sampleCompanies[0], id: 998 })
    }

    // ----- Deals -----
    if (path === '/deals/pipeline' && method === 'GET') {
      return json(route, samplePipeline)
    }
    if (path === '/deals' && method === 'GET') {
      return json(route, paginated(sampleDeals))
    }
    if (/^\/deals\/\d+$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2])
      const d = sampleDeals.find((x) => x.id === id) ?? sampleDeals[0]
      return json(route, {
        ...d,
        notes: null,
        updatedAt: '2024-06-02T00:00:00Z',
        activities: [],
        insights: [],
      })
    }
    if (path === '/deals' && method === 'POST') {
      return json(route, { ...sampleDeals[0], id: 997 })
    }

    // ----- Activities -----
    if (path === '/activities' && method === 'GET') {
      return json(route, paginated(sampleActivities))
    }
    if (path === '/activities' && method === 'POST') {
      return json(route, { ...sampleActivities[0], id: 996 })
    }

    // ----- Tags -----
    if (path === '/tags' && method === 'GET') {
      return json(route, [])
    }
    if (path === '/tags' && method === 'POST') {
      return json(route, { id: 1, name: 'New', color: '#02795f', createdAt: '2024-01-01T00:00:00Z' })
    }

    // ----- Admin / Users -----
    if (path === '/admin/users' && method === 'GET') {
      return json(route, [TEST_ADMIN, TEST_USER])
    }

    // ----- AI -----
    if (path === '/ai/search' && method === 'POST') {
      return json(route, {
        interpretation: 'Found matching results',
        contacts: sampleContacts,
        activities: sampleActivities,
      })
    }
    if (path === '/ai/summarize' && method === 'POST') {
      return json(route, { summary: 'Concise summary of the input.' })
    }

    // Anything else: empty success
    return json(route, {})
  })
}

/**
 * Pre-seeds the auth token in localStorage so the app boots authenticated.
 * Must be called BEFORE the first `page.goto()`.
 */
export async function loginAs(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('sunroom_token', 'e2e-fake-token')
  })
}

/**
 * Extended test fixture that provides an authenticated page with all API
 * routes mocked. The page is navigated to /dashboard before use.
 */
export const test = base.extend<{ authenticatedPage: ReturnType<typeof base['page']> }>({
  authenticatedPage: async ({ page }, use) => {
    await mockApi(page)
    await loginAs(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await use(page)
  },
})

export { expect }
