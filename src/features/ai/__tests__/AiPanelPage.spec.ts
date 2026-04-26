import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { renderWithPlugins } from '@/test/render'
import { useAiStore } from '@/stores/ai.store'
import AiPanelPage from '../AiPanelPage.vue'

const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(AiPanelPage) }),
})

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

/** Create a mock fetch Response that returns an SSE stream of tokens. */
function sseResponse(tokens: string[]): Response {
  return new Response(sseStream(tokens), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
    ],
  })
  router.push('/')
  return router
}

function renderPage(router = makeRouter()) {
  return renderWithPlugins(AppWrapped, { router })
}

describe('AiPanelPage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(sseResponse([]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the page header and tabs', async () => {
    const { findByText } = renderPage()
    expect(await findByText('AI Assistant')).toBeInTheDocument()
    expect(await findByText('Smart Search')).toBeInTheDocument()
    expect(await findByText('Summarize')).toBeInTheDocument()
    expect(await findByText('Deal Insights')).toBeInTheDocument()
  })

  it('does not submit search when query is empty', async () => {
    const { findByText } = renderPage()
    const searchBtn = await findByText('Search')
    await fireEvent.click(searchBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('performs a smart search and displays streamed results', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Showing', ' recent', ' contacts', ' at', ' Acme']))
    const { container } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'recent contacts at Acme')
    const searchBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Search',
    ) as HTMLButtonElement
    await fireEvent.click(searchBtn)
    await waitFor(() => {
      expect(document.body.textContent).toContain('Showing recent contacts at Acme')
    })
  })

  it('submits search on Enter key', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Search', ' results', ' here']))
    const { container } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test query')
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Search results here')
    })
  })

  it('shows streamed search results from fetch', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['No', ' results', ' found']))
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'nobody')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('No results found')
    })
  })

  it('displays search result tokens from stream', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Grace', ' Hopper', ' is', ' a', ' contact']))
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('Grace Hopper is a contact')
    })
  })

  it('switches to the Summarize tab and performs summarization', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['This', ' is', ' a', ' concise', ' summary.']))
    const { container } = renderPage()
    // Switch to Summarize tab.
    const tabs = container.querySelectorAll('.v-tab')
    const summarizeTab = Array.from(tabs).find((t) => t.textContent?.includes('Summarize')) as HTMLElement
    await fireEvent.click(summarizeTab)
    // Wait for the Summarize tab to become active.
    await waitFor(() => {
      const textareas = document.body.querySelectorAll('textarea')
      expect(textareas.length).toBeGreaterThan(0)
    })
    // Vuetify v-textarea v-model doesn't sync from native DOM events in jsdom.
    // Interact with the store directly after verifying the UI rendered.
    const aiStore = useAiStore()
    await aiStore.summarize('Long meeting notes text here.')
    await waitFor(() => {
      expect(document.body.textContent).toContain('This is a concise summary.')
    })
  })

  it('does not submit summarize when text is empty', async () => {
    const { container } = renderPage()
    const tabs = container.querySelectorAll('.v-tab')
    const summarizeTab = Array.from(tabs).find((t) => t.textContent?.includes('Summarize')) as HTMLElement
    await fireEvent.click(summarizeTab)
    await waitFor(() => {
      expect(document.body.querySelector('textarea')).not.toBeNull()
    })
    const summarizeBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Summarize',
    ) as HTMLButtonElement
    await fireEvent.click(summarizeBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders search results without interpretation', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Grace', ' Hopper']))
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('Grace Hopper')
    })
  })

  it('exercises onSummarize via component ref', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Via', ' ref.']))
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    // Call with empty text first (covers truthy branch / early return).
    state.summarizeText = ''
    state.onSummarize()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
    // Call with non-empty text (covers falsy branch + aiStore.summarize call).
    fetchSpy.mockResolvedValue(sseResponse(['Via', ' ref.']))
    state.summarizeText = 'Some text'
    await state.onSummarize()
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  /* ---- Deal Insights tab ---- */

  it('switches to Deal Insights tab and shows the deal ID input', async () => {
    const { container } = renderPage()
    const tabs = container.querySelectorAll('.v-tab')
    const insightsTab = Array.from(tabs).find((t) => t.textContent?.includes('Deal Insights')) as HTMLElement
    await fireEvent.click(insightsTab)
    await waitFor(() => {
      const inputs = document.body.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBeGreaterThan(0)
    })
    // Exercise the v-model setter on the deal ID input (Vuetify v-text-field).
    const dealInput = document.body.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(dealInput, '123')
  })

  it('submits deal insights on Enter key in the deal ID input', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Enter', ' key', ' insights.']))
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    state.tab = 2
    state.dealIdInput = '55'
    // Wait for the tab to render the deal insights section
    await waitFor(() => {
      const inputs = document.body.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBeGreaterThan(0)
    })
    const dealInput = document.body.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.keyDown(dealInput, { key: 'Enter', code: 'Enter' })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Enter key insights.')
    })
  })

  it('does not submit deal insights when deal ID is empty', async () => {
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    state.dealIdInput = ''
    state.onGenerateInsights()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not submit deal insights for invalid (non-numeric) ID', async () => {
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    state.dealIdInput = 'abc'
    state.onGenerateInsights()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not submit deal insights for zero or negative ID', async () => {
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    state.dealIdInput = '0'
    state.onGenerateInsights()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()

    state.dealIdInput = '-5'
    state.onGenerateInsights()
    await new Promise((r) => setTimeout(r, 50))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('generates deal insights via component ref and displays streamed results', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Strong', ' pipeline', ' momentum.']))
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    // Switch to the Deal Insights tab
    state.tab = 2
    state.dealIdInput = '42'
    await state.onGenerateInsights()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Strong pipeline momentum.')
    })
  })

  it('shows Insights heading when insightsResult is available', async () => {
    fetchSpy.mockResolvedValue(sseResponse(['Recommendation:', ' increase', ' outreach.']))
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VApp, null, {
            default: () => h(AiPanelPage, { ref: compRef }),
          })
      },
    })
    const router = makeRouter()
    renderWithPlugins(Wrapper, { router })
    await waitFor(() => {
      expect(compRef.value).not.toBeNull()
    })
    const state = compRef.value.$.setupState
    state.tab = 2
    state.dealIdInput = '7'
    await state.onGenerateInsights()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Insights')
      expect(document.body.textContent).toContain('Recommendation: increase outreach.')
    })
  })
})
