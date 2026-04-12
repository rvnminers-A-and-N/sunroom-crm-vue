import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useAuthStore } from '../auth.store'
import { makeAuthResponse, makeUser, makeAdmin } from '@/test/fixtures'

const TOKEN_KEY = 'sunroom_token'
const API = 'http://localhost:5236/api'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initial state', () => {
    it('starts with no user and reads token from localStorage when present', () => {
      localStorage.setItem(TOKEN_KEY, 'persisted-token')
      const store = useAuthStore()
      expect(store.user).toBeNull()
      expect(store.token).toBe('persisted-token')
      expect(store.isAuthenticated).toBe(true)
      expect(store.isAdmin).toBe(false)
    })

    it('starts with token=null when localStorage is empty', () => {
      const store = useAuthStore()
      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('isAdmin getter', () => {
    it('returns true when the user role is Admin', async () => {
      server.use(
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json(makeAuthResponse({ user: makeAdmin() })),
        ),
      )
      const store = useAuthStore()
      await store.login({ email: 'a@b.c', password: 'pw' })
      expect(store.isAdmin).toBe(true)
    })

    it('returns false when the user role is not Admin', async () => {
      const store = useAuthStore()
      await store.login({ email: 'a@b.c', password: 'pw' })
      expect(store.isAdmin).toBe(false)
    })

    it('returns false when no user is loaded', () => {
      const store = useAuthStore()
      expect(store.isAdmin).toBe(false)
    })
  })

  describe('login', () => {
    it('stores the token, user, and persists the token to localStorage', async () => {
      server.use(
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json(makeAuthResponse({ token: 'new-token' })),
        ),
      )
      const store = useAuthStore()
      await store.login({ email: 'ada@example.com', password: 'secret' })
      expect(store.token).toBe('new-token')
      expect(store.user?.email).toBe('ada@example.com')
      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token')
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('register', () => {
    it('stores the token, user, and persists the token to localStorage', async () => {
      server.use(
        http.post(`${API}/auth/register`, () =>
          HttpResponse.json(makeAuthResponse({ token: 'reg-token' })),
        ),
      )
      const store = useAuthStore()
      await store.register({ name: 'Ada', email: 'ada@example.com', password: 'secret' })
      expect(store.token).toBe('reg-token')
      expect(localStorage.getItem(TOKEN_KEY)).toBe('reg-token')
    })
  })

  describe('loadCurrentUser', () => {
    it('fetches /auth/me and assigns the result to user', async () => {
      server.use(
        http.get(`${API}/auth/me`, () => HttpResponse.json(makeUser({ name: 'Loaded User' }))),
      )
      const store = useAuthStore()
      await store.loadCurrentUser()
      expect(store.user?.name).toBe('Loaded User')
    })
  })

  describe('logout', () => {
    it('clears token, user, and removes the persisted token', async () => {
      const store = useAuthStore()
      await store.login({ email: 'a@b.c', password: 'pw' })
      expect(store.token).not.toBeNull()
      store.logout()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
  })
})
