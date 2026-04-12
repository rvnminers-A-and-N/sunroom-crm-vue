import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useDealStore } from '../deal.store'
import { makeDeal, makeDealDetail, makePipeline, makePaginationMeta } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useDealStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchDeals', () => {
    it('loads deals, total, and returns meta', async () => {
      const meta = makePaginationMeta({ total: 4 })
      server.use(
        http.get(`${API}/deals`, () =>
          HttpResponse.json({
            data: [makeDeal({ id: 1 }), makeDeal({ id: 2 }), makeDeal({ id: 3 }), makeDeal({ id: 4 })],
            meta,
          }),
        ),
      )
      const store = useDealStore()
      const result = await store.fetchDeals({ page: 1, perPage: 20 })
      expect(store.deals).toHaveLength(4)
      expect(store.total).toBe(4)
      expect(store.loading).toBe(false)
      expect(result).toEqual(meta)
    })

    it('clears loading on failure', async () => {
      server.use(http.get(`${API}/deals`, () => new HttpResponse(null, { status: 500 })))
      const store = useDealStore()
      await expect(store.fetchDeals({ page: 1, perPage: 20 })).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchDeal', () => {
    it('loads a single deal detail', async () => {
      server.use(
        http.get(`${API}/deals/:id`, ({ params }) =>
          HttpResponse.json(makeDealDetail({ id: Number(params.id), title: 'Big One' })),
        ),
      )
      const store = useDealStore()
      await store.fetchDeal(99)
      expect(store.deal?.id).toBe(99)
      expect(store.deal?.title).toBe('Big One')
      expect(store.loading).toBe(false)
    })

    it('clears loading on failure', async () => {
      server.use(http.get(`${API}/deals/:id`, () => new HttpResponse(null, { status: 404 })))
      const store = useDealStore()
      await expect(store.fetchDeal(99)).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchPipeline', () => {
    it('loads the pipeline data', async () => {
      server.use(http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())))
      const store = useDealStore()
      await store.fetchPipeline()
      expect(store.pipeline?.stages).toHaveLength(6)
      expect(store.loading).toBe(false)
    })

    it('clears loading on failure', async () => {
      server.use(http.get(`${API}/deals/pipeline`, () => new HttpResponse(null, { status: 500 })))
      const store = useDealStore()
      await expect(store.fetchPipeline()).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('createDeal', () => {
    it('POSTs to /deals', async () => {
      let body: unknown
      server.use(
        http.post(`${API}/deals`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(makeDeal(), { status: 201 })
        }),
      )
      const store = useDealStore()
      await store.createDeal({ title: 'New', value: 100, contactId: 1, stage: 'Lead' })
      expect(body).toEqual({ title: 'New', value: 100, contactId: 1, stage: 'Lead' })
    })
  })

  describe('updateDeal', () => {
    it('PUTs to /deals/:id', async () => {
      let url: string | null = null
      server.use(
        http.put(`${API}/deals/:id`, ({ request, params }) => {
          url = request.url
          return HttpResponse.json(makeDeal({ id: Number(params.id) }))
        }),
      )
      const store = useDealStore()
      await store.updateDeal(12, { title: 'Updated', value: 200, contactId: 1 })
      expect(url).toContain('/deals/12')
    })
  })

  describe('deleteDeal', () => {
    it('DELETEs /deals/:id', async () => {
      let url: string | null = null
      server.use(
        http.delete(`${API}/deals/:id`, ({ request }) => {
          url = request.url
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const store = useDealStore()
      await store.deleteDeal(55)
      expect(url).toContain('/deals/55')
    })
  })
})
