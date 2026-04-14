import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeSmartSearchResponse, makeSummarizeResponse, makeContact, makeActivity } from '@/test/fixtures'
import { useAiStore } from '@/stores/ai.store'
import AiPanelPage from '../AiPanelPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(AiPanelPage) }),
})

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
  it('renders the page header and tabs', async () => {
    const { findByText } = renderPage()
    expect(await findByText('AI Assistant')).toBeInTheDocument()
    expect(await findByText('Smart Search')).toBeInTheDocument()
    expect(await findByText('Summarize')).toBeInTheDocument()
  })

  it('does not submit search when query is empty', async () => {
    let postCount = 0
    server.use(
      http.post(`${API}/ai/search`, () => {
        postCount++
        return HttpResponse.json(makeSmartSearchResponse())
      }),
    )
    const { findByText } = renderPage()
    const searchBtn = await findByText('Search')
    await fireEvent.click(searchBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(postCount).toBe(0)
  })

  it('performs a smart search and displays results with contacts and activities', async () => {
    server.use(
      http.post(`${API}/ai/search`, () => HttpResponse.json(makeSmartSearchResponse())),
    )
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'recent contacts at Acme')
    const searchBtn = await findByText('Search')
    await fireEvent.click(searchBtn)
    await waitFor(() => {
      expect(document.body.textContent).toContain('Showing recent contacts at Acme')
    })
    expect(document.body.textContent).toContain('Grace Hopper')
    expect(document.body.textContent).toContain('Intro call')
  })

  it('submits search on Enter key', async () => {
    server.use(
      http.post(`${API}/ai/search`, () => HttpResponse.json(makeSmartSearchResponse())),
    )
    const { container } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test query')
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    await waitFor(() => {
      expect(document.body.textContent).toContain('Showing recent contacts at Acme')
    })
  })

  it('shows "No results found" when search returns empty contacts and activities', async () => {
    server.use(
      http.post(`${API}/ai/search`, () =>
        HttpResponse.json(makeSmartSearchResponse({ contacts: [], activities: [] })),
      ),
    )
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'nobody')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('No results found')
    })
  })

  it('renders contact without companyName', async () => {
    server.use(
      http.post(`${API}/ai/search`, () =>
        HttpResponse.json(
          makeSmartSearchResponse({
            contacts: [makeContact({ companyName: null })],
            activities: [],
          }),
        ),
      ),
    )
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('Grace Hopper')
    })
  })

  it('switches to the Summarize tab and performs summarization', async () => {
    server.use(
      http.post(`${API}/ai/summarize`, () =>
        HttpResponse.json(makeSummarizeResponse({ summary: 'This is a concise summary.' })),
      ),
    )
    const { findByText, container } = renderPage()
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
    let postCount = 0
    server.use(
      http.post(`${API}/ai/summarize`, () => {
        postCount++
        return HttpResponse.json(makeSummarizeResponse())
      }),
    )
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
    expect(postCount).toBe(0)
  })

  it('renders search results without interpretation', async () => {
    server.use(
      http.post(`${API}/ai/search`, () =>
        HttpResponse.json(
          makeSmartSearchResponse({ interpretation: '' }),
        ),
      ),
    )
    const { container, findByText } = renderPage()
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'test')
    await fireEvent.click(await findByText('Search'))
    await waitFor(() => {
      expect(document.body.textContent).toContain('Grace Hopper')
    })
  })

  it('exercises onSummarize via component ref', async () => {
    let postCount = 0
    server.use(
      http.post(`${API}/ai/summarize`, () => {
        postCount++
        return HttpResponse.json(makeSummarizeResponse({ summary: 'Via ref.' }))
      }),
    )
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
    expect(postCount).toBe(0)
    // Call with non-empty text (covers falsy branch + aiStore.summarize call).
    state.summarizeText = 'Some text'
    await state.onSummarize()
    await waitFor(() => {
      expect(postCount).toBe(1)
    })
  })
})
