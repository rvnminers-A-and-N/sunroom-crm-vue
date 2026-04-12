import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useCompanyStore } from '../company.store'
import { makeCompany, makeCompanyDetail, makePaginationMeta } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useCompanyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchCompanies', () => {
    it('passes page/perPage params and stores results', async () => {
      let url: URL | null = null
      const meta = makePaginationMeta({ total: 2, currentPage: 3, perPage: 5 })
      server.use(
        http.get(`${API}/companies`, ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json({
            data: [makeCompany({ id: 1 }), makeCompany({ id: 2 })],
            meta,
          })
        }),
      )
      const store = useCompanyStore()
      const result = await store.fetchCompanies(3, 5)
      expect(url!.searchParams.get('page')).toBe('3')
      expect(url!.searchParams.get('perPage')).toBe('5')
      expect(url!.searchParams.get('search')).toBeNull()
      expect(store.companies).toHaveLength(2)
      expect(store.total).toBe(2)
      expect(result).toEqual(meta)
    })

    it('appends the search param when search is a non-empty string', async () => {
      let url: URL | null = null
      server.use(
        http.get(`${API}/companies`, ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json({ data: [], meta: makePaginationMeta({ total: 0 }) })
        }),
      )
      const store = useCompanyStore()
      await store.fetchCompanies(1, 10, 'acme')
      expect(url!.searchParams.get('search')).toBe('acme')
    })

    it('omits the search param when search is undefined', async () => {
      let url: URL | null = null
      server.use(
        http.get(`${API}/companies`, ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json({ data: [], meta: makePaginationMeta({ total: 0 }) })
        }),
      )
      const store = useCompanyStore()
      await store.fetchCompanies(1, 10, undefined)
      expect(url!.searchParams.get('search')).toBeNull()
    })

    it('omits the search param when search is the empty string (falsy)', async () => {
      let url: URL | null = null
      server.use(
        http.get(`${API}/companies`, ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json({ data: [], meta: makePaginationMeta({ total: 0 }) })
        }),
      )
      const store = useCompanyStore()
      await store.fetchCompanies(1, 10, '')
      expect(url!.searchParams.get('search')).toBeNull()
    })

    it('clears the loading flag on failure', async () => {
      server.use(http.get(`${API}/companies`, () => new HttpResponse(null, { status: 500 })))
      const store = useCompanyStore()
      await expect(store.fetchCompanies(1, 10)).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchCompany', () => {
    it('loads a single company detail', async () => {
      server.use(
        http.get(`${API}/companies/:id`, ({ params }) =>
          HttpResponse.json(makeCompanyDetail({ id: Number(params.id), name: 'Loaded Co' })),
        ),
      )
      const store = useCompanyStore()
      await store.fetchCompany(11)
      expect(store.company?.id).toBe(11)
      expect(store.company?.name).toBe('Loaded Co')
      expect(store.loading).toBe(false)
    })

    it('clears the loading flag on failure', async () => {
      server.use(http.get(`${API}/companies/:id`, () => new HttpResponse(null, { status: 404 })))
      const store = useCompanyStore()
      await expect(store.fetchCompany(11)).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('createCompany', () => {
    it('POSTs to /companies', async () => {
      let body: unknown
      server.use(
        http.post(`${API}/companies`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(makeCompany(), { status: 201 })
        }),
      )
      const store = useCompanyStore()
      await store.createCompany({ name: 'New Co' })
      expect(body).toEqual({ name: 'New Co' })
    })
  })

  describe('updateCompany', () => {
    it('PUTs to /companies/:id', async () => {
      let url: string | null = null
      server.use(
        http.put(`${API}/companies/:id`, ({ request, params }) => {
          url = request.url
          return HttpResponse.json(makeCompany({ id: Number(params.id) }))
        }),
      )
      const store = useCompanyStore()
      await store.updateCompany(7, { name: 'Updated' })
      expect(url).toContain('/companies/7')
    })
  })

  describe('deleteCompany', () => {
    it('DELETEs /companies/:id', async () => {
      let url: string | null = null
      server.use(
        http.delete(`${API}/companies/:id`, ({ request }) => {
          url = request.url
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const store = useCompanyStore()
      await store.deleteCompany(33)
      expect(url).toContain('/companies/33')
    })
  })
})
