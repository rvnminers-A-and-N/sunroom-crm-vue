import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useAdminStore } from '../admin.store'
import { makeUser, makeAdmin } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('fetchUsers', () => {
    it('loads users and clears the loading flag', async () => {
      server.use(
        http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser(), makeAdmin()])),
      )
      const store = useAdminStore()
      await store.fetchUsers()
      expect(store.users).toHaveLength(2)
      expect(store.loading).toBe(false)
    })

    it('clears the loading flag on failure', async () => {
      server.use(http.get(`${API}/admin/users`, () => new HttpResponse(null, { status: 500 })))
      const store = useAdminStore()
      await expect(store.fetchUsers()).rejects.toBeDefined()
      expect(store.loading).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('replaces the user in place when found', async () => {
      const store = useAdminStore()
      store.users = [makeUser({ id: 1, name: 'A' }), makeUser({ id: 2, name: 'B' })]
      server.use(
        http.put(`${API}/admin/users/:id`, ({ params }) =>
          HttpResponse.json(makeUser({ id: Number(params.id), name: 'A Updated' })),
        ),
      )
      await store.updateUser(1, { name: 'A Updated' })
      expect(store.users[0]!.name).toBe('A Updated')
      expect(store.users[1]!.name).toBe('B')
    })

    it('does not insert when the id is missing from the local list', async () => {
      const store = useAdminStore()
      store.users = [makeUser({ id: 1, name: 'A' })]
      server.use(
        http.put(`${API}/admin/users/:id`, ({ params }) =>
          HttpResponse.json(makeUser({ id: Number(params.id), name: 'Ghost' })),
        ),
      )
      await store.updateUser(999, { name: 'Ghost' })
      expect(store.users).toHaveLength(1)
      expect(store.users[0]!.name).toBe('A')
    })
  })

  describe('deleteUser', () => {
    it('DELETEs and removes the user from the local list', async () => {
      const store = useAdminStore()
      store.users = [makeUser({ id: 1 }), makeUser({ id: 2 }), makeUser({ id: 3 })]
      server.use(
        http.delete(`${API}/admin/users/:id`, () => new HttpResponse(null, { status: 204 })),
      )
      await store.deleteUser(2)
      expect(store.users.map((u) => u.id)).toEqual([1, 3])
    })
  })
})
