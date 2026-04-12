import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useContactStore } from '../contact.store'
import { makeContact, makeContactDetail, makePaginated, makePaginationMeta } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useContactStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchContacts', () => {
    it('loads contacts, total, and returns the meta object', async () => {
      const meta = makePaginationMeta({ total: 3, currentPage: 2, perPage: 10, lastPage: 1 })
      server.use(
        http.get(`${API}/contacts`, () =>
          HttpResponse.json({
            data: [makeContact({ id: 1 }), makeContact({ id: 2 }), makeContact({ id: 3 })],
            meta,
          }),
        ),
      )
      const store = useContactStore()
      const result = await store.fetchContacts({ page: 2, perPage: 10 })
      expect(store.contacts).toHaveLength(3)
      expect(store.total).toBe(3)
      expect(store.loading).toBe(false)
      expect(result).toEqual(meta)
    })

    it('clears the loading flag even if the request fails', async () => {
      server.use(http.get(`${API}/contacts`, () => new HttpResponse(null, { status: 500 })))
      const store = useContactStore()
      await expect(store.fetchContacts({ page: 1, perPage: 10 })).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchContact', () => {
    it('loads a single contact detail and toggles loading', async () => {
      server.use(
        http.get(`${API}/contacts/:id`, ({ params }) =>
          HttpResponse.json(makeContactDetail({ id: Number(params.id), firstName: 'Loaded' })),
        ),
      )
      const store = useContactStore()
      await store.fetchContact(7)
      expect(store.contact?.id).toBe(7)
      expect(store.contact?.firstName).toBe('Loaded')
      expect(store.loading).toBe(false)
    })

    it('clears the loading flag on failure', async () => {
      server.use(http.get(`${API}/contacts/:id`, () => new HttpResponse(null, { status: 404 })))
      const store = useContactStore()
      await expect(store.fetchContact(7)).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('createContact', () => {
    it('POSTs to /contacts', async () => {
      let received: unknown
      server.use(
        http.post(`${API}/contacts`, async ({ request }) => {
          received = await request.json()
          return HttpResponse.json(makeContact(), { status: 201 })
        }),
      )
      const store = useContactStore()
      await store.createContact({ firstName: 'New', lastName: 'Person', email: 'n@p.c' })
      expect(received).toEqual({ firstName: 'New', lastName: 'Person', email: 'n@p.c' })
    })
  })

  describe('updateContact', () => {
    it('PUTs to /contacts/:id', async () => {
      let url: string | null = null
      server.use(
        http.put(`${API}/contacts/:id`, ({ request, params }) => {
          url = request.url
          return HttpResponse.json(makeContact({ id: Number(params.id) }))
        }),
      )
      const store = useContactStore()
      await store.updateContact(42, { firstName: 'Updated', lastName: 'Person' })
      expect(url).toContain('/contacts/42')
    })
  })

  describe('deleteContact', () => {
    it('DELETEs /contacts/:id', async () => {
      let url: string | null = null
      server.use(
        http.delete(`${API}/contacts/:id`, ({ request }) => {
          url = request.url
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const store = useContactStore()
      await store.deleteContact(99)
      expect(url).toContain('/contacts/99')
    })
  })

  describe('syncTags', () => {
    it('PUTs the tag id list to /contacts/:id/tags', async () => {
      let received: unknown
      let url: string | null = null
      server.use(
        http.put(`${API}/contacts/:id/tags`, async ({ request }) => {
          url = request.url
          received = await request.json()
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const store = useContactStore()
      await store.syncTags(5, [1, 2, 3])
      expect(url).toContain('/contacts/5/tags')
      expect(received).toEqual([1, 2, 3])
    })
  })
})
