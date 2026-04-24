import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamSSE } from '../sse-stream'

const API = 'http://localhost:5236/api'

/** Build a ReadableStream from raw SSE text lines. */
function rawStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

/** Build a fetch Response wrapping an SSE body stream. */
function sseResponse(chunks: string[], status = 200): Response {
  return new Response(rawStream(chunks), {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

/** Collect all yielded tokens from the async generator. */
async function collect(gen: AsyncGenerator<string, void, undefined>): Promise<string[]> {
  const tokens: string[] = []
  for await (const t of gen) {
    tokens.push(t)
  }
  return tokens
}

describe('streamSSE', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('yields tokens from well-formed SSE frames', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"token":"Hello"}\n\n',
        'data: {"token":" world"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/ai/search/stream', { query: 'q' }, 'tok'))
    expect(tokens).toEqual(['Hello', ' world'])
  })

  it('throws on non-OK response status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    )
    await expect(collect(streamSSE('/test', {}, null))).rejects.toThrow(
      'Stream request failed: 500',
    )
  })

  it('sends Authorization header when token is provided', async () => {
    let capturedHeaders: Headers | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers((init as RequestInit).headers)
      return sseResponse(['data: [DONE]\n\n'])
    })
    await collect(streamSSE('/test', {}, 'my-token'))
    expect(capturedHeaders!.get('Authorization')).toBe('Bearer my-token')
  })

  it('omits Authorization header when token is null', async () => {
    let capturedHeaders: Headers | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers((init as RequestInit).headers)
      return sseResponse(['data: [DONE]\n\n'])
    })
    await collect(streamSSE('/test', {}, null))
    expect(capturedHeaders!.get('Authorization')).toBeNull()
  })

  it('passes the abort signal to fetch', async () => {
    let capturedSignal: AbortSignal | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedSignal = (init as RequestInit).signal as AbortSignal
      return sseResponse(['data: [DONE]\n\n'])
    })
    const controller = new AbortController()
    await collect(streamSSE('/test', {}, null, controller.signal))
    expect(capturedSignal).toBe(controller.signal)
  })

  it('skips empty lines and non-data lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        '\n',
        ': comment\n',
        'event: ping\n',
        'data: {"token":"ok"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/test', {}, null))
    expect(tokens).toEqual(['ok'])
  })

  it('ignores frames with no token field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"other":"value"}\n\n',
        'data: {"token":"yes"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/test', {}, null))
    expect(tokens).toEqual(['yes'])
  })

  it('silently continues on malformed JSON (SyntaxError)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: not-json\n\n',
        'data: {"token":"after"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/test', {}, null))
    expect(tokens).toEqual(['after'])
  })

  it('re-throws non-SyntaxError from parsed error payload (lines 49-50)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"error":"something went wrong"}\n\n',
      ]),
    )
    await expect(collect(streamSSE('/test', {}, null))).rejects.toThrow(
      'something went wrong',
    )
  })

  it('handles buffered chunks that split across reads', async () => {
    // Simulate a chunk boundary in the middle of a line
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"tok',
        'en":"split"}\n\ndata: [DONE]\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/test', {}, null))
    expect(tokens).toEqual(['split'])
  })

  it('returns when stream ends without [DONE]', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'data: {"token":"only"}\n\n',
      ]),
    )
    const tokens = await collect(streamSSE('/test', {}, null))
    expect(tokens).toEqual(['only'])
  })

  it('posts to the correct URL with JSON body', async () => {
    let capturedUrl: string | undefined
    let capturedBody: unknown
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = url as string
      capturedBody = JSON.parse((init as RequestInit).body as string)
      return sseResponse(['data: [DONE]\n\n'])
    })
    await collect(streamSSE('/ai/search/stream', { query: 'test' }, null))
    expect(capturedUrl).toBe(`${API}/ai/search/stream`)
    expect(capturedBody).toEqual({ query: 'test' })
  })
})
