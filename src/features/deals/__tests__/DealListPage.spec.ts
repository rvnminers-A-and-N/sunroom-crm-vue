import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeDeal, makePaginated } from '@/test/fixtures'
import { useDealStore } from '@/stores/deal.store'
import DealListPage from '../DealListPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(DealListPage) }),
})

const VDataTableServerStub = defineComponent({
  name: 'VDataTableServerStub',
  props: {
    headers: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    itemsLength: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    page: { type: Number, default: 1 },
    itemsPerPage: { type: Number, default: 10 },
  },
  emits: ['click:row', 'update:options'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'data-table-stub' }, [
        h(
          'button',
          {
            'data-testid': 'fire-update-options',
            onClick: () => emit('update:options', { page: 2, itemsPerPage: 25 }),
          },
          'fire',
        ),
        h(
          'ul',
          { class: 'rows' },
          (props.items as Array<{ id: number }>).map((item) =>
            h(
              'li',
              {
                key: item.id,
                'data-testid': `row-${item.id}`,
                onClick: (e: Event) => emit('click:row', e, { item }),
              },
              [
                slots['item.title']?.({ item }),
                slots['item.value']?.({ item }),
                slots['item.stage']?.({ item }),
                slots['item.companyName']?.({ item }),
                slots['item.expectedCloseDate']?.({ item }),
                slots['item.actions']?.({ item }),
              ],
            ),
          ),
        ),
      ])
  },
})

function makeDealsRouter(initial = '/deals') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/deals', name: 'deals', component: Stub },
      { path: '/deals/pipeline', name: 'deal-pipeline', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

function renderPage(router = makeDealsRouter()) {
  return renderWithPlugins(AppWrapped, {
    router,
    renderOptions: {
      global: { stubs: { 'v-data-table-server': VDataTableServerStub } },
    },
  })
}

describe('DealListPage', () => {
  it('renders the page header and loads the first page of deals', async () => {
    server.use(
      http.get(`${API}/deals`, () =>
        HttpResponse.json(makePaginated([makeDeal({ id: 1, title: 'Big Deal' })], { total: 1 })),
      ),
    )
    const { findByText, findByTestId } = renderPage()
    expect(await findByText('Deals')).toBeInTheDocument()
    const stub = await findByTestId('data-table-stub')
    await waitFor(() => {
      expect(stub.textContent).toContain('Big Deal')
    })
  })

  it('shows the empty state when there are no deals', async () => {
    server.use(
      http.get(`${API}/deals`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No deals yet')).toBeInTheDocument()
    })
  })

  it('shows the empty state action button which opens the create dialog', async () => {
    server.use(
      http.get(`${API}/deals`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText, getAllByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No deals yet')).toBeInTheDocument()
    })
    const addButtons = getAllByText('Add Deal')
    await fireEvent.click(addButtons[addButtons.length - 1] as HTMLElement)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
  })

  it('debounces search input and refetches', async () => {
    vi.useFakeTimers()
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/deals`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeDeal()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    await vi.waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'enterprise')
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seen).toContain('enterprise')
    })
    vi.useRealTimers()
  })

  it('clears the search field and refetches', async () => {
    const seenSearches: Array<string | null> = []
    server.use(
      http.get(`${API}/deals`, ({ request }) => {
        seenSearches.push(new URL(request.url).searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeDeal()], { total: 1 }))
      }),
    )
    vi.useFakeTimers()
    const { container } = renderPage()
    await vi.waitFor(() => {
      expect(seenSearches.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'enterprise')
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seenSearches).toContain('enterprise')
    })
    const clearBtn = container.querySelector('.v-field__clearable .v-icon') as HTMLElement
    await fireEvent.click(clearBtn)
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seenSearches.slice(-2).some((v) => v === null)).toBe(true)
    })
    vi.useRealTimers()
  })

  it('refetches with the selected stage when the stage filter changes', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/deals`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('stage'))
        return HttpResponse.json(makePaginated([makeDeal()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    await waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    const selectActivator = container.querySelectorAll('.v-field')[1] as HTMLElement
    await fireEvent.mouseDown(selectActivator)
    await waitFor(() => {
      expect(document.body.querySelector('.v-list-item')).not.toBeNull()
    })
    const items = Array.from(document.body.querySelectorAll('.v-list-item'))
    const wonOption = items.find((el) => el.textContent?.includes('Won')) as HTMLElement
    await fireEvent.click(wonOption)
    await waitFor(() => {
      expect(seen).toContain('Won')
    })
  })

  it('navigates to the deal detail route when a row is clicked', async () => {
    server.use(
      http.get(`${API}/deals`, () =>
        HttpResponse.json(makePaginated([makeDeal({ id: 42, title: 'Nav Deal' })], { total: 1 })),
      ),
    )
    const router = makeDealsRouter()
    const { findByTestId } = renderPage(router)
    const row = await findByTestId('row-42')
    await fireEvent.click(row)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('deal-detail')
      expect(router.currentRoute.value.params.id).toBe('42')
    })
  })

  it('opens the edit dialog when the row pencil icon is clicked', async () => {
    server.use(
      http.get(`${API}/deals`, () =>
        HttpResponse.json(makePaginated([makeDeal({ id: 5, title: 'EditDeal' })], { total: 1 })),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-5')
    const pencil = row.querySelector('button .mdi-pencil') as HTMLElement
    await fireEvent.click(pencil)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Deal'))).toBe(true)
    })
  })

  it('opens the confirm dialog and deletes the deal when confirmed', async () => {
    let deleteCount = 0
    let listCount = 0
    server.use(
      http.get(`${API}/deals`, () => {
        listCount++
        return HttpResponse.json(makePaginated([makeDeal({ id: 9, title: 'DelDeal' })], { total: 1 }))
      }),
      http.delete(`${API}/deals/9`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-9')
    const trash = row.querySelector('button .mdi-delete') as HTMLElement
    await fireEvent.click(trash)
    await waitFor(() => {
      const buttons = Array.from(document.body.querySelectorAll('button'))
      expect(buttons.find((b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'))).toBeTruthy()
    })
    const confirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'),
    ) as HTMLButtonElement
    await fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(deleteCount).toBe(1)
      expect(listCount).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders fallback dashes for missing company and expected close date', async () => {
    server.use(
      http.get(`${API}/deals`, () =>
        HttpResponse.json(
          makePaginated(
            [makeDeal({ id: 1, companyName: null, expectedCloseDate: null })],
            { total: 1 },
          ),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    expect((row.textContent ?? '').match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('renders the expected close date when present', async () => {
    server.use(
      http.get(`${API}/deals`, () =>
        HttpResponse.json(
          makePaginated(
            [makeDeal({ id: 2, expectedCloseDate: '2026-06-01T00:00:00.000Z' })],
            { total: 1 },
          ),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-2')
    // formatDate should render something that is NOT an em-dash.
    expect(row.textContent).not.toContain('—')
  })

  it('closes the form and reloads deals when the form dialog emits saved', async () => {
    let listCount = 0
    server.use(
      http.get(`${API}/deals`, () => {
        listCount++
        return HttpResponse.json(makePaginated([], { total: 0 }))
      }),
    )
    const DealFormDialogStub = defineComponent({
      name: 'DealFormDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        deal: { type: Object, default: null },
      },
      emits: ['update:modelValue', 'saved'],
      setup(props, { emit }) {
        return () =>
          h(
            'div',
            { 'data-testid': 'form-dialog-stub', 'data-open': String(props.modelValue) },
            [
              h('button', { 'data-testid': 'fire-saved', onClick: () => emit('saved') }, 'fire-saved'),
              h('button', { 'data-testid': 'fire-update-model', onClick: () => emit('update:modelValue', false) }, 'fire-update-model'),
            ],
          )
      },
    })
    const { findByTestId, getAllByText } = renderWithPlugins(AppWrapped, {
      router: makeDealsRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-data-table-server': VDataTableServerStub,
            DealFormDialog: DealFormDialogStub,
          },
        },
      },
    })
    await waitFor(() => {
      expect(listCount).toBe(1)
    })
    const headerAdd = getAllByText('Add Deal')[0] as HTMLElement
    await fireEvent.click(headerAdd)
    const stub = await findByTestId('form-dialog-stub')
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    await fireEvent.click(await findByTestId('fire-saved'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
      expect(listCount).toBe(2)
    })
    // Exercise v-model setter.
    await fireEvent.click(getAllByText('Add Deal')[0] as HTMLElement)
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    await fireEvent.click(await findByTestId('fire-update-model'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
    })
  })

  it('skips the delete API call when onDelete fires without a target deal', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/deals`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
      http.delete(`${API}/deals/:id`, () => {
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
    const { findByTestId } = renderWithPlugins(AppWrapped, {
      router: makeDealsRouter(),
      renderOptions: {
        global: {
          stubs: { 'v-data-table-server': VDataTableServerStub, ConfirmDialog: ConfirmDialogStub },
        },
      },
    })
    await fireEvent.click(await findByTestId('fire-confirm'))
    await new Promise((r) => setTimeout(r, 50))
    expect(deleteCount).toBe(0)
  })

  it('updates page and perPage when the data table emits update:options', async () => {
    const seenPages: Array<string | null> = []
    const seenPerPage: Array<string | null> = []
    server.use(
      http.get(`${API}/deals`, ({ request }) => {
        const url = new URL(request.url)
        seenPages.push(url.searchParams.get('page'))
        seenPerPage.push(url.searchParams.get('perPage'))
        return HttpResponse.json(makePaginated([makeDeal()], { total: 1 }))
      }),
    )
    const { findByTestId } = renderPage()
    await waitFor(() => {
      expect(seenPages).toContain('1')
    })
    await fireEvent.click(await findByTestId('fire-update-options'))
    await waitFor(() => {
      expect(seenPages).toContain('2')
      expect(seenPerPage).toContain('25')
    })
  })

  it('skips updating meta when fetchDeals resolves with no meta payload', async () => {
    server.use(
      http.get(`${API}/deals`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { findByText } = renderPage()
    await findByText('Deals')
    const store = useDealStore()
    const spy = vi.spyOn(store, 'fetchDeals').mockResolvedValueOnce(undefined as never)
    const fireBtn = document.body.querySelector('[data-testid="fire-update-options"]') as HTMLElement
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    await nextTick()
  })
})
