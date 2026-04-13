import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeCompany, makePaginated } from '@/test/fixtures'
import { useCompanyStore } from '@/stores/company.store'
import CompanyListPage from '../CompanyListPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(CompanyListPage) }),
})

/**
 * Lightweight stub for v-data-table-server. Renders one <li> per item and
 * exposes every column slot so the inline template render functions get
 * exercised. Also exposes a "fire" button so tests can manually emit
 * update:options without depending on Vuetify's pagination footer (which
 * jsdom can't render reliably).
 */
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
                slots['item.name']?.({ item }),
                slots['item.industry']?.({ item }),
                slots['item.location']?.({ item }),
                slots['item.actions']?.({ item }),
              ],
            ),
          ),
        ),
      ])
  },
})

function makeCompaniesRouter(initial = '/companies') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/companies', name: 'companies', component: Stub },
      { path: '/companies/:id', name: 'company-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

function renderPage(router = makeCompaniesRouter()) {
  return renderWithPlugins(AppWrapped, {
    router,
    renderOptions: {
      global: {
        stubs: { 'v-data-table-server': VDataTableServerStub },
      },
    },
  })
}

describe('CompanyListPage', () => {
  it('renders the page header and loads the first page of companies', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(
          makePaginated([makeCompany({ id: 1, name: 'Acme Inc' })], { total: 1 }),
        ),
      ),
    )
    const { findByText, findByTestId } = renderPage()
    expect(await findByText('Companies')).toBeInTheDocument()
    const stub = await findByTestId('data-table-stub')
    await waitFor(() => {
      expect(stub.textContent).toContain('Acme Inc')
    })
  })

  it('shows the empty state when there are no companies', async () => {
    server.use(
      http.get(`${API}/companies`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No companies yet')).toBeInTheDocument()
    })
  })

  it('shows the empty state action button which opens the create dialog', async () => {
    server.use(
      http.get(`${API}/companies`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText, getAllByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No companies yet')).toBeInTheDocument()
    })
    const addButtons = getAllByText('Add Company')
    await fireEvent.click(addButtons[addButtons.length - 1] as HTMLElement)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
    })
  })

  it('debounces search input and refetches with the new search query', async () => {
    vi.useFakeTimers()
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/companies`, ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeCompany()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    await vi.waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'acme')
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seen).toContain('acme')
    })
    vi.useRealTimers()
  })

  it('clears the search field and refetches with no search query', async () => {
    const seenSearches: Array<string | null> = []
    server.use(
      http.get(`${API}/companies`, ({ request }) => {
        const url = new URL(request.url)
        seenSearches.push(url.searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeCompany()], { total: 1 }))
      }),
    )
    vi.useFakeTimers()
    const { container } = renderPage()
    await vi.waitFor(() => {
      expect(seenSearches.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'acme')
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seenSearches).toContain('acme')
    })
    const clearBtn = container.querySelector('.v-field__clearable .v-icon') as HTMLElement
    await fireEvent.click(clearBtn)
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      const lastValues = seenSearches.slice(-2)
      expect(lastValues.some((v) => v === null)).toBe(true)
    })
    vi.useRealTimers()
  })

  it('navigates to the company detail route when a row is clicked', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(makePaginated([makeCompany({ id: 42, name: 'Acme' })], { total: 1 })),
      ),
    )
    const router = makeCompaniesRouter()
    const { findByTestId } = renderPage(router)
    const row = await findByTestId('row-42')
    await fireEvent.click(row)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('company-detail')
      expect(router.currentRoute.value.params.id).toBe('42')
    })
  })

  it('opens the edit dialog when the row pencil icon is clicked', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(makePaginated([makeCompany({ id: 5, name: 'EditCo' })], { total: 1 })),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-5')
    const pencil = row.querySelector('button .mdi-pencil') as HTMLElement
    expect(pencil).not.toBeNull()
    await fireEvent.click(pencil)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Company'))).toBe(true)
    })
  })

  it('opens the confirm dialog and deletes the company when confirmed', async () => {
    let deleteCount = 0
    let listCount = 0
    server.use(
      http.get(`${API}/companies`, () => {
        listCount++
        return HttpResponse.json(makePaginated([makeCompany({ id: 9, name: 'DelCo' })], { total: 1 }))
      }),
      http.delete(`${API}/companies/9`, () => {
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
      const found = buttons.find((b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'))
      expect(found).toBeTruthy()
    })
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'),
    ) as HTMLButtonElement
    await fireEvent.click(confirmButton)
    await waitFor(() => {
      expect(deleteCount).toBe(1)
    })
    await waitFor(() => {
      expect(listCount).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders fallback dashes for missing industry and location', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(
          makePaginated(
            [makeCompany({ id: 1, name: 'NoData', industry: null, city: null, state: null })],
            { total: 1 },
          ),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    expect((row.textContent ?? '').match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('renders the location string when both city and state are present', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(
          makePaginated([makeCompany({ id: 2, name: 'LocCo', city: 'Austin', state: 'TX' })], {
            total: 1,
          }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-2')
    expect(row.textContent).toContain('Austin')
    expect(row.textContent).toContain('TX')
    expect(row.textContent).toContain(',')
  })

  it('renders only the city when state is missing', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json(
          makePaginated([makeCompany({ id: 3, name: 'CityOnly', city: 'Austin', state: null })], {
            total: 1,
          }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-3')
    expect(row.textContent).toContain('Austin')
    expect(row.textContent).not.toContain(',')
  })

  it('closes the form and reloads companies when the form dialog emits saved', async () => {
    let listCount = 0
    server.use(
      http.get(`${API}/companies`, () => {
        listCount++
        return HttpResponse.json(makePaginated([], { total: 0 }))
      }),
    )
    // Stub CompanyFormDialog so we can fire @saved on demand and verify the
    // parent's onFormSaved handler closes the dialog and refetches the list.
    const CompanyFormDialogStub = defineComponent({
      name: 'CompanyFormDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        company: { type: Object, default: null },
      },
      emits: ['update:modelValue', 'saved'],
      setup(props, { emit }) {
        return () =>
          h(
            'div',
            { 'data-testid': 'form-dialog-stub', 'data-open': String(props.modelValue) },
            [
              h(
                'button',
                {
                  'data-testid': 'fire-saved',
                  onClick: () => emit('saved'),
                },
                'fire-saved',
              ),
              h(
                'button',
                {
                  'data-testid': 'fire-update-model',
                  onClick: () => emit('update:modelValue', false),
                },
                'fire-update-model',
              ),
            ],
          )
      },
    })
    const { findByTestId, getAllByText } = renderWithPlugins(AppWrapped, {
      router: makeCompaniesRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-data-table-server': VDataTableServerStub,
            CompanyFormDialog: CompanyFormDialogStub,
          },
        },
      },
    })
    await waitFor(() => {
      expect(listCount).toBe(1)
    })
    const headerAdd = getAllByText('Add Company')[0] as HTMLElement
    await fireEvent.click(headerAdd)
    const stub = await findByTestId('form-dialog-stub')
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    const fireSaved = await findByTestId('fire-saved')
    await fireEvent.click(fireSaved)
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
      expect(listCount).toBe(2)
    })
    // Re-open and dismiss via update:modelValue to exercise the v-model setter.
    const headerAdd2 = getAllByText('Add Company')[0] as HTMLElement
    await fireEvent.click(headerAdd2)
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    const fireUpdate = await findByTestId('fire-update-model')
    await fireEvent.click(fireUpdate)
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
    })
  })

  it('skips the delete API call when onDelete fires without a target company', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/companies`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
      http.delete(`${API}/companies/:id`, () => {
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
          h(
            'button',
            {
              'data-testid': 'fire-confirm',
              onClick: () => emit('confirm'),
            },
            'fire-confirm',
          )
      },
    })
    const { findByTestId } = renderWithPlugins(AppWrapped, {
      router: makeCompaniesRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-data-table-server': VDataTableServerStub,
            ConfirmDialog: ConfirmDialogStub,
          },
        },
      },
    })
    const fire = await findByTestId('fire-confirm')
    await fireEvent.click(fire)
    await new Promise((r) => setTimeout(r, 50))
    expect(deleteCount).toBe(0)
  })

  it('updates page and perPage when the data table emits update:options', async () => {
    const seenPages: Array<string | null> = []
    const seenPerPage: Array<string | null> = []
    server.use(
      http.get(`${API}/companies`, ({ request }) => {
        const url = new URL(request.url)
        seenPages.push(url.searchParams.get('page'))
        seenPerPage.push(url.searchParams.get('perPage'))
        return HttpResponse.json(makePaginated([makeCompany()], { total: 1 }))
      }),
    )
    const { findByTestId } = renderPage()
    await waitFor(() => {
      expect(seenPages).toContain('1')
    })
    const fireBtn = await findByTestId('fire-update-options')
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(seenPages).toContain('2')
      expect(seenPerPage).toContain('25')
    })
  })

  it('skips updating meta when fetchCompanies resolves with no meta payload', async () => {
    server.use(
      http.get(`${API}/companies`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { findByText } = renderPage()
    await findByText('Companies')
    const store = useCompanyStore()
    const spy = vi.spyOn(store, 'fetchCompanies').mockResolvedValueOnce(undefined as never)
    const fireBtn = document.body.querySelector('[data-testid="fire-update-options"]') as HTMLElement
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    await nextTick()
  })
})
