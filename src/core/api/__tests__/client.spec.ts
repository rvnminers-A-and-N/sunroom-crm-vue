import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import apiClient from '../client'

const TOKEN_KEY = 'sunroom_token'
const API = 'http://localhost:5236/api'

describe('apiClient', () => {
  describe('request interceptor', () => {
    it('attaches the bearer token from localStorage when one is present', async () => {
      localStorage.setItem(TOKEN_KEY, 'abc-123')
      let seen: string | null = null
      server.use(
        http.get(`${API}/contacts`, ({ request }) => {
          seen = request.headers.get('authorization')
          return HttpResponse.json([])
        }),
      )
      await apiClient.get('/contacts')
      expect(seen).toBe('Bearer abc-123')
    })

    it('omits the Authorization header when no token is stored', async () => {
      // setup.ts clears localStorage between tests, so the token is absent.
      let seen: string | null | undefined = undefined
      server.use(
        http.get(`${API}/contacts`, ({ request }) => {
          seen = request.headers.get('authorization')
          return HttpResponse.json([])
        }),
      )
      await apiClient.get('/contacts')
      expect(seen).toBeNull()
    })
  })

  describe('response interceptor', () => {
    let originalLocation: Location
    let hrefAssigned: string | null
    const originalHref = 'http://localhost:3000/'

    beforeEach(() => {
      hrefAssigned = null
      originalLocation = window.location
      // jsdom's window.location is read-only; replace it with a writable stub
      // so we can observe the redirect performed by the interceptor without
      // breaking fetch's URL resolution (which reads location.href).
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
          ...originalLocation,
          set href(value: string) {
            hrefAssigned = value
          },
          get href() {
            return hrefAssigned ?? originalHref
          },
        },
      })
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      })
      vi.restoreAllMocks()
    })

    it('passes successful responses through unchanged', async () => {
      server.use(
        http.get(`${API}/contacts`, () => HttpResponse.json({ ok: true, value: 7 })),
      )
      const response = await apiClient.get('/contacts')
      expect(response.status).toBe(200)
      expect(response.data).toEqual({ ok: true, value: 7 })
    })

    it('clears the token and redirects to /auth/login on a 401 response', async () => {
      localStorage.setItem(TOKEN_KEY, 'expired-token')
      server.use(
        http.get(`${API}/contacts`, () => new HttpResponse(null, { status: 401 })),
      )
      await expect(apiClient.get('/contacts')).rejects.toMatchObject({
        response: { status: 401 },
      })
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      expect(hrefAssigned).toBe('/auth/login')
    })

    it('rejects non-401 errors without clearing the token or redirecting', async () => {
      localStorage.setItem(TOKEN_KEY, 'still-valid')
      server.use(
        http.get(`${API}/contacts`, () => new HttpResponse(null, { status: 500 })),
      )
      await expect(apiClient.get('/contacts')).rejects.toMatchObject({
        response: { status: 500 },
      })
      expect(localStorage.getItem(TOKEN_KEY)).toBe('still-valid')
      expect(hrefAssigned).toBeNull()
    })

    it('rejects errors that have no response object (e.g. network failure) without redirecting', async () => {
      server.use(
        http.get(`${API}/contacts`, () => HttpResponse.error()),
      )
      await expect(apiClient.get('/contacts')).rejects.toBeDefined()
      expect(hrefAssigned).toBeNull()
    })
  })
})
