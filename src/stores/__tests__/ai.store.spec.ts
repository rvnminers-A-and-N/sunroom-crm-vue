import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useAiStore } from '../ai.store'
import { makeSmartSearchResponse, makeSummarizeResponse } from '@/test/fixtures'

const API = 'http://localhost:5236/api'

describe('useAiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('smartSearch', () => {
    it('clears the previous result, sets the new one, and clears searching', async () => {
      server.use(
        http.post(`${API}/ai/search`, () =>
          HttpResponse.json(makeSmartSearchResponse({ interpretation: 'Found 1 contact' })),
        ),
      )
      const store = useAiStore()
      // seed an old result so we can verify it gets cleared
      store.searchResult = makeSmartSearchResponse({ interpretation: 'old' })
      await store.smartSearch('acme')
      expect(store.searchResult?.interpretation).toBe('Found 1 contact')
      expect(store.searching).toBe(false)
    })

    it('passes the query in the POST body', async () => {
      let body: unknown
      server.use(
        http.post(`${API}/ai/search`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(makeSmartSearchResponse())
        }),
      )
      const store = useAiStore()
      await store.smartSearch('acme corp')
      expect(body).toEqual({ query: 'acme corp' })
    })

    it('clears the searching flag on failure', async () => {
      server.use(http.post(`${API}/ai/search`, () => new HttpResponse(null, { status: 500 })))
      const store = useAiStore()
      await expect(store.smartSearch('x')).rejects.toBeDefined()
      expect(store.searching).toBe(false)
    })
  })

  describe('summarize', () => {
    it('clears the previous summary and stores the new one', async () => {
      server.use(
        http.post(`${API}/ai/summarize`, () =>
          HttpResponse.json(makeSummarizeResponse({ summary: 'Brief summary.' })),
        ),
      )
      const store = useAiStore()
      store.summaryResult = 'old summary'
      await store.summarize('Long text to summarize')
      expect(store.summaryResult).toBe('Brief summary.')
      expect(store.summarizing).toBe(false)
    })

    it('passes the text in the POST body', async () => {
      let body: unknown
      server.use(
        http.post(`${API}/ai/summarize`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(makeSummarizeResponse())
        }),
      )
      const store = useAiStore()
      await store.summarize('hello world')
      expect(body).toEqual({ text: 'hello world' })
    })

    it('clears the summarizing flag on failure', async () => {
      server.use(http.post(`${API}/ai/summarize`, () => new HttpResponse(null, { status: 500 })))
      const store = useAiStore()
      await expect(store.summarize('x')).rejects.toBeDefined()
      expect(store.summarizing).toBe(false)
    })
  })
})
