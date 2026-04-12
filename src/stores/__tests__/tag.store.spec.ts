import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useTagStore } from '../tag.store'
import { makeTag } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useTagStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchTags', () => {
    it('loads tags from /tags', async () => {
      server.use(
        http.get(`${API}/tags`, () =>
          HttpResponse.json([makeTag({ id: 1, name: 'A' }), makeTag({ id: 2, name: 'B' })]),
        ),
      )
      const store = useTagStore()
      await store.fetchTags()
      expect(store.tags).toHaveLength(2)
      expect(store.tags[0]!.name).toBe('A')
    })
  })

  describe('createTag', () => {
    it('POSTs and appends the new tag, returning it', async () => {
      server.use(
        http.post(`${API}/tags`, () =>
          HttpResponse.json(makeTag({ id: 99, name: 'New' }), { status: 201 }),
        ),
      )
      const store = useTagStore()
      const created = await store.createTag({ name: 'New', color: '#000000' })
      expect(created.id).toBe(99)
      expect(store.tags).toHaveLength(1)
      expect(store.tags[0]!.id).toBe(99)
    })
  })

  describe('updateTag', () => {
    it('replaces an existing tag in place when found', async () => {
      const store = useTagStore()
      store.tags = [makeTag({ id: 1, name: 'Old' }), makeTag({ id: 2, name: 'Other' })]
      server.use(
        http.put(`${API}/tags/:id`, ({ params }) =>
          HttpResponse.json(makeTag({ id: Number(params.id), name: 'Updated' })),
        ),
      )
      const result = await store.updateTag(1, { name: 'Updated', color: '#ffffff' })
      expect(result.name).toBe('Updated')
      expect(store.tags[0]!.name).toBe('Updated')
      expect(store.tags[1]!.name).toBe('Other')
    })

    it('does not insert when the id is missing from the local list', async () => {
      const store = useTagStore()
      store.tags = [makeTag({ id: 1, name: 'Existing' })]
      server.use(
        http.put(`${API}/tags/:id`, ({ params }) =>
          HttpResponse.json(makeTag({ id: Number(params.id), name: 'Ghost' })),
        ),
      )
      await store.updateTag(999, { name: 'Ghost', color: '#ffffff' })
      expect(store.tags).toHaveLength(1)
      expect(store.tags[0]!.name).toBe('Existing')
    })
  })

  describe('deleteTag', () => {
    it('DELETEs and removes the tag from the local list', async () => {
      const store = useTagStore()
      store.tags = [makeTag({ id: 1 }), makeTag({ id: 2 }), makeTag({ id: 3 })]
      server.use(http.delete(`${API}/tags/:id`, () => new HttpResponse(null, { status: 204 })))
      await store.deleteTag(2)
      expect(store.tags.map((t) => t.id)).toEqual([1, 3])
    })
  })
})
