import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useDashboardStore } from '../dashboard.store'
import { makeDashboardData } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useDashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with data=null and loading=false', () => {
    const store = useDashboardStore()
    expect(store.data).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('loads dashboard data and clears the loading flag', async () => {
    server.use(
      http.get(`${API}/dashboard`, () =>
        HttpResponse.json(makeDashboardData({ totalContacts: 100 })),
      ),
    )
    const store = useDashboardStore()
    await store.fetchDashboard()
    expect(store.data?.totalContacts).toBe(100)
    expect(store.loading).toBe(false)
  })

  it('clears the loading flag on failure', async () => {
    server.use(http.get(`${API}/dashboard`, () => new HttpResponse(null, { status: 500 })))
    const store = useDashboardStore()
    await expect(store.fetchDashboard()).rejects.toBeDefined()
    expect(store.loading).toBe(false)
  })
})
