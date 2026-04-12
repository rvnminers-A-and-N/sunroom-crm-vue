import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useActivityStore } from '../activity.store'
import { makeActivity, makePaginationMeta } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useActivityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchActivities', () => {
    it('loads activities, total, and returns meta', async () => {
      const meta = makePaginationMeta({ total: 2 })
      server.use(
        http.get(`${API}/activities`, () =>
          HttpResponse.json({
            data: [makeActivity({ id: 1 }), makeActivity({ id: 2 })],
            meta,
          }),
        ),
      )
      const store = useActivityStore()
      const result = await store.fetchActivities({ page: 1, perPage: 20 })
      expect(store.activities).toHaveLength(2)
      expect(store.total).toBe(2)
      expect(store.loading).toBe(false)
      expect(result).toEqual(meta)
    })

    it('clears loading on failure', async () => {
      server.use(http.get(`${API}/activities`, () => new HttpResponse(null, { status: 500 })))
      const store = useActivityStore()
      await expect(store.fetchActivities({ page: 1, perPage: 20 })).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('createActivity', () => {
    it('POSTs to /activities', async () => {
      let body: unknown
      server.use(
        http.post(`${API}/activities`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(makeActivity(), { status: 201 })
        }),
      )
      const store = useActivityStore()
      await store.createActivity({ type: 'Note', subject: 'Hi', body: 'Body' })
      expect(body).toEqual({ type: 'Note', subject: 'Hi', body: 'Body' })
    })
  })

  describe('updateActivity', () => {
    it('PUTs to /activities/:id', async () => {
      let url: string | null = null
      server.use(
        http.put(`${API}/activities/:id`, ({ request, params }) => {
          url = request.url
          return HttpResponse.json(makeActivity({ id: Number(params.id) }))
        }),
      )
      const store = useActivityStore()
      await store.updateActivity(8, { type: 'Note', subject: 'Updated' })
      expect(url).toContain('/activities/8')
    })
  })

  describe('deleteActivity', () => {
    it('DELETEs /activities/:id', async () => {
      let url: string | null = null
      server.use(
        http.delete(`${API}/activities/:id`, ({ request }) => {
          url = request.url
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const store = useActivityStore()
      await store.deleteActivity(17)
      expect(url).toContain('/activities/17')
    })
  })
})
