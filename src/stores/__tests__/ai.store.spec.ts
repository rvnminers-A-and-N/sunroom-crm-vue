import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore } from '../ai.store'

/** Build a ReadableStream that emits SSE frames for each token, then [DONE]. */
function sseStream(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const t of tokens) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: t })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

describe('useAiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  describe('smartSearch', () => {
    it('streams tokens into searchResult and clears searching flag', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(sseStream(['Hello', ' ', 'world']), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      )
      const store = useAiStore()
      await store.smartSearch('acme')
      expect(store.searchResult).toBe('Hello world')
      expect(store.searching).toBe(false)
    })

    it('passes the query in the POST body', async () => {
      let capturedBody: unknown
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse((init as RequestInit).body as string)
        return new Response(sseStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      })
      const store = useAiStore()
      await store.smartSearch('acme corp')
      expect(capturedBody).toEqual({ query: 'acme corp' })
    })

    it('stores an error message on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 }),
      )
      const store = useAiStore()
      await store.smartSearch('x')
      expect(store.searchResult).toContain('Error')
      expect(store.searching).toBe(false)
    })
  })

  describe('summarize', () => {
    it('streams tokens into summaryResult and clears summarizing flag', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(sseStream(['Brief', ' ', 'summary.']), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      )
      const store = useAiStore()
      await store.summarize('Long text to summarize')
      expect(store.summaryResult).toBe('Brief summary.')
      expect(store.summarizing).toBe(false)
    })

    it('passes the text in the POST body', async () => {
      let capturedBody: unknown
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse((init as RequestInit).body as string)
        return new Response(sseStream([]), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      })
      const store = useAiStore()
      await store.summarize('hello world')
      expect(capturedBody).toEqual({ text: 'hello world' })
    })

    it('stores an error message on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 }),
      )
      const store = useAiStore()
      await store.summarize('x')
      expect(store.summaryResult).toContain('Error')
      expect(store.summarizing).toBe(false)
    })
  })
})
