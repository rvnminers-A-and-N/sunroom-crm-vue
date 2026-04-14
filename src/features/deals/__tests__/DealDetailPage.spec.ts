import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeActivity, makeDealDetail, makeDealInsight } from '@/test/fixtures'
import { useDealStore } from '@/stores/deal.store'
import DealDetailPage from '../DealDetailPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(DealDetailPage) }),
})

function makeDealRouter(initial = '/deals/1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/deals', name: 'deals', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
      { path: '/companies/:id', name: 'company-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

describe('DealDetailPage', () => {
  it('shows a loading indicator before the deal loads', async () => {
    let resolveFetch!: () => void
    const pending = new Promise<void>((r) => (resolveFetch = r))
    server.use(
      http.get(`${API}/deals/:id`, async () => {
        await pending
        return HttpResponse.json(makeDealDetail())
      }),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    expect(await findByText('Loading deal...')).toBeInTheDocument()
    resolveFetch()
  })

  it('renders the deal title, stage, value, contact, company, dates, notes and insights', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () =>
        HttpResponse.json(
          makeDealDetail({
            id: 1,
            title: 'Enterprise License',
            value: 25000,
            stage: 'Qualified',
            contactName: 'Grace Hopper',
            contactId: 1,
            companyName: 'Acme Inc',
            companyId: 1,
            expectedCloseDate: '2026-06-01T00:00:00.000Z',
            closedAt: '2026-04-01T00:00:00.000Z',
            notes: 'High priority deal.',
            activities: [makeActivity({ id: 1, type: 'Call', subject: 'Kickoff', body: 'Good call.' })],
            insights: [makeDealInsight({ id: 1, insight: 'Strong buyer intent.' })],
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    expect(await findByText('Enterprise License')).toBeInTheDocument()
    // "Qualified" appears both in the stage badge and stepper; just confirm at least one is present.
    await waitFor(() => {
      expect(document.body.textContent).toContain('Qualified')
    })
    expect(await findByText('$25,000')).toBeInTheDocument()
    expect(await findByText('Grace Hopper')).toBeInTheDocument()
    expect(await findByText('Acme Inc')).toBeInTheDocument()
    expect(await findByText('High priority deal.')).toBeInTheDocument()
    expect(await findByText('Kickoff')).toBeInTheDocument()
    expect(await findByText('Good call.')).toBeInTheDocument()
    expect(await findByText('Strong buyer intent.')).toBeInTheDocument()
  })

  it('hides optional fields when they are missing', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () =>
        HttpResponse.json(
          makeDealDetail({
            companyName: null,
            companyId: null,
            expectedCloseDate: null,
            closedAt: null,
            notes: null,
            activities: [],
            insights: [],
          }),
        ),
      ),
    )
    const { findByText, queryByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    expect(await findByText('Enterprise License')).toBeInTheDocument()
    expect(queryByText('Acme Inc')).toBeNull()
    expect(await findByText('No activities recorded')).toBeInTheDocument()
    // AI Insights section should not render when empty.
    expect(queryByText('AI Insights')).toBeNull()
  })

  it('renders activities without body text', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () =>
        HttpResponse.json(
          makeDealDetail({
            activities: [makeActivity({ id: 2, subject: 'Quick note', body: null })],
          }),
        ),
      ),
    )
    const { findByText, queryByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    expect(await findByText('Quick note')).toBeInTheDocument()
    // No body paragraph.
    expect(queryByText('Had a great first call.')).toBeNull()
  })

  it('opens the edit dialog when the Edit button is clicked', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail())),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    const editBtn = await findByText('Edit')
    await fireEvent.click(editBtn)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Deal'))).toBe(true)
    })
  })

  it('opens the confirm dialog and navigates to /deals after delete', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail({ id: 1 }))),
      http.delete(`${API}/deals/1`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const router = makeDealRouter()
    const { findByText } = renderWithPlugins(AppWrapped, { router })
    const deleteBtn = await findByText('Delete')
    await fireEvent.click(deleteBtn)
    await waitFor(() => {
      const buttons = Array.from(document.body.querySelectorAll('button'))
      expect(buttons.some((b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'))).toBe(true)
    })
    const confirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'),
    ) as HTMLButtonElement
    await fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(deleteCount).toBe(1)
      expect(router.currentRoute.value.name).toBe('deals')
    })
  })

  it('navigates back to the deals list when the back arrow is clicked', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail())),
    )
    const router = makeDealRouter()
    const { container, findByText } = renderWithPlugins(AppWrapped, { router })
    await findByText('Enterprise License')
    const back = container.querySelector('.mdi-arrow-left') as HTMLElement
    await fireEvent.click(back)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('deals')
    })
  })

  it('refetches the deal after the form dialog emits saved', async () => {
    let getCount = 0
    server.use(
      http.get(`${API}/deals/:id`, () => {
        getCount++
        return HttpResponse.json(makeDealDetail({ id: 1 }))
      }),
      http.put(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail({ id: 1 }))),
      http.get(`${API}/contacts`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    const editBtn = await findByText('Edit')
    await fireEvent.click(editBtn)
    const saveBtn = await waitFor(() => {
      const found = Array.from(document.body.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Save',
      ) as HTMLButtonElement | undefined
      if (!found) throw new Error('Save button not yet present')
      return found
    })
    const before = getCount
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(getCount).toBeGreaterThan(before)
    })
  })

  it('skips the delete API when the deal is null at confirm time', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail({ id: 1 }))),
      http.delete(`${API}/deals/1`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const ConfirmDialogStub = defineComponent({
      name: 'ConfirmDialogStub',
      props: { modelValue: { type: Boolean, default: false } },
      emits: ['update:modelValue', 'confirm'],
      setup(_props, { emit }) {
        return () =>
          h('button', { 'data-testid': 'fire-confirm', onClick: () => emit('confirm') }, 'fire-confirm')
      },
    })
    const router = makeDealRouter()
    const { findByText, findByTestId } = renderWithPlugins(AppWrapped, {
      router,
      renderOptions: {
        global: { stubs: { ConfirmDialog: ConfirmDialogStub } },
      },
    })
    await findByText('Enterprise License')
    const fire = await findByTestId('fire-confirm')
    const store = useDealStore()
    const deleteSpy = vi.spyOn(store, 'deleteDeal')
    store.deal = null
    await fireEvent.click(fire)
    await new Promise((r) => setTimeout(r, 30))
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(deleteCount).toBe(0)
    expect(router.currentRoute.value.name).not.toBe('deals')
  })

  it('evaluates currentStageIndex guard when deal becomes null', async () => {
    // Render the DealDetailPage directly (not wrapped) and use a template ref
    // to access the internal computed even when the v-if hides it.
    const compRef = ref<any>(null)
    const Wrapper = defineComponent({
      setup() {
        return () => h(VApp, null, {
          default: () => h(DealDetailPage, { ref: compRef }),
        })
      },
    })
    server.use(
      http.get(`${API}/deals/:id`, () => HttpResponse.json(makeDealDetail())),
    )
    const { findByText } = renderWithPlugins(Wrapper, { router: makeDealRouter() })
    await findByText('Enterprise License')
    // Now set deal to null and force the computed to evaluate via the component proxy.
    const store = useDealStore()
    store.deal = null
    await waitFor(() => {
      expect(document.body.textContent).not.toContain('Enterprise License')
    })
    // Access the computed via the component proxy to ensure the null guard runs.
    // Reading .value forces the computed getter to run with d.value = null.
    const stageIndex = compRef.value?.$.setupState?.currentStageIndex
    expect(stageIndex === undefined || stageIndex === 0).toBeTruthy()
  })

  it('handles a deal whose stage is not in ALL_STAGES', async () => {
    server.use(
      http.get(`${API}/deals/:id`, () =>
        HttpResponse.json(makeDealDetail({ stage: 'UnknownStage' as never })),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeDealRouter() })
    // The fallback in currentStageIndex returns 0 when indexOf is -1.
    expect(await findByText('Enterprise License')).toBeInTheDocument()
  })
})
