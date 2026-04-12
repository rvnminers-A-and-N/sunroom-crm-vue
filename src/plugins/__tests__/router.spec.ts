import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useAuthStore } from '@/stores/auth.store'
import { makeUser, makeAdmin } from '@/test/fixtures'

// Stub every lazy-loaded route component so navigation never has to import the
// real feature pages (and pull in their entire dependency graph) during the
// guard tests below.
vi.mock('@/features/auth/LoginPage.vue', () => ({
  default: { template: '<div>login</div>' },
}))
vi.mock('@/features/auth/RegisterPage.vue', () => ({
  default: { template: '<div>register</div>' },
}))
vi.mock('@/layouts/DefaultLayout.vue', () => ({
  default: { template: '<router-view />' },
}))
vi.mock('@/features/dashboard/DashboardPage.vue', () => ({
  default: { template: '<div>dashboard</div>' },
}))
vi.mock('@/features/contacts/ContactListPage.vue', () => ({
  default: { template: '<div>contacts</div>' },
}))
vi.mock('@/features/contacts/ContactDetailPage.vue', () => ({
  default: { template: '<div>contact</div>' },
}))
vi.mock('@/features/companies/CompanyListPage.vue', () => ({
  default: { template: '<div>companies</div>' },
}))
vi.mock('@/features/companies/CompanyDetailPage.vue', () => ({
  default: { template: '<div>company</div>' },
}))
vi.mock('@/features/deals/DealListPage.vue', () => ({
  default: { template: '<div>deals</div>' },
}))
vi.mock('@/features/deals/DealPipelinePage.vue', () => ({
  default: { template: '<div>pipeline</div>' },
}))
vi.mock('@/features/deals/DealDetailPage.vue', () => ({
  default: { template: '<div>deal</div>' },
}))
vi.mock('@/features/activities/ActivityListPage.vue', () => ({
  default: { template: '<div>activities</div>' },
}))
vi.mock('@/features/ai/AiPanelPage.vue', () => ({
  default: { template: '<div>ai</div>' },
}))
vi.mock('@/features/settings/SettingsPage.vue', () => ({
  default: { template: '<div>settings</div>' },
}))
vi.mock('@/features/admin/UserManagementPage.vue', () => ({
  default: { template: '<div>admin</div>' },
}))

const API = 'http://localhost:5236/api'
const TOKEN_KEY = 'sunroom_token'

// We import the router lazily inside each test so that the fresh Pinia instance
// from beforeEach is the active one when the guard reads the auth store.
async function loadRouter() {
  const mod = await import('../router')
  return mod.default
}

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('allows public routes (e.g. /auth/login) without authentication', async () => {
    const router = await loadRouter()
    await router.push('/auth/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects unauthenticated users away from protected routes to /auth/login', async () => {
    const router = await loadRouter()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows authenticated users with a loaded user to reach protected routes', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    const router = await loadRouter()
    const auth = useAuthStore()
    auth.user = makeUser()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('loads the current user when authenticated but no user is cached, then proceeds', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(makeUser({ name: 'Loaded' }))))
    const router = await loadRouter()
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(auth.user?.name).toBe('Loaded')
  })

  it('logs the user out and redirects to login when loadCurrentUser fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired')
    server.use(http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 401 })))
    const router = await loadRouter()
    const auth = useAuthStore()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('redirects non-admin users away from /admin to /dashboard', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    const router = await loadRouter()
    const auth = useAuthStore()
    auth.user = makeUser() // role: 'User'
    await router.push('/admin')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('lets admin users into /admin', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    const router = await loadRouter()
    const auth = useAuthStore()
    auth.user = makeAdmin()
    await router.push('/admin')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('redirects unknown paths to /dashboard via the catch-all route', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    const router = await loadRouter()
    const auth = useAuthStore()
    auth.user = makeUser()
    await router.push('/totally-not-a-real-route')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('redirects "/" to /dashboard when authenticated', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    const router = await loadRouter()
    const auth = useAuthStore()
    auth.user = makeUser()
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  // Each route is lazy-loaded via `() => import('...')`. Navigating to every
  // route ensures every import factory is invoked at least once, which the v8
  // function-coverage instrumentation tracks individually.
  const routes: Array<{ path: string; name: string; admin?: boolean }> = [
    { path: '/auth/register', name: 'register' },
    { path: '/contacts', name: 'contacts' },
    { path: '/contacts/42', name: 'contact-detail' },
    { path: '/companies', name: 'companies' },
    { path: '/companies/7', name: 'company-detail' },
    { path: '/deals', name: 'deals' },
    { path: '/deals/pipeline', name: 'deal-pipeline' },
    { path: '/deals/9', name: 'deal-detail' },
    { path: '/activities', name: 'activities' },
    { path: '/ai', name: 'ai' },
    { path: '/settings', name: 'settings' },
  ]

  for (const { path, name } of routes) {
    it(`navigates to ${path} when authenticated`, async () => {
      localStorage.setItem(TOKEN_KEY, 'valid')
      const router = await loadRouter()
      const auth = useAuthStore()
      auth.user = makeAdmin()
      await router.push(path)
      await router.isReady()
      expect(router.currentRoute.value.name).toBe(name)
    })
  }
})
