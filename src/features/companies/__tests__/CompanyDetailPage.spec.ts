import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeCompanyDetail, makeContact, makeDeal } from '@/test/fixtures'
import { useCompanyStore } from '@/stores/company.store'
import CompanyDetailPage from '../CompanyDetailPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(CompanyDetailPage) }),
})

function makeCompanyRouter(initial = '/companies/1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/companies', name: 'companies', component: Stub },
      { path: '/companies/:id', name: 'company-detail', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

describe('CompanyDetailPage', () => {
  it('shows a loading indicator before the company loads', async () => {
    let resolveFetch!: () => void
    const pending = new Promise<void>((r) => (resolveFetch = r))
    server.use(
      http.get(`${API}/companies/:id`, async () => {
        await pending
        return HttpResponse.json(makeCompanyDetail())
      }),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    expect(await findByText('Loading company...')).toBeInTheDocument()
    resolveFetch()
  })

  it('renders the company name, industry, website, phone, address and notes', async () => {
    server.use(
      http.get(`${API}/companies/:id`, ({ params }) =>
        HttpResponse.json(
          makeCompanyDetail({
            id: Number(params.id),
            name: 'Sunroom Labs',
            industry: 'Software',
            website: 'https://sunroom.example.com',
            phone: '555-1212',
            address: '1 Main St',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            notes: 'Top customer.',
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    expect(await findByText('Sunroom Labs')).toBeInTheDocument()
    expect(await findByText('Software')).toBeInTheDocument()
    expect(await findByText('https://sunroom.example.com')).toBeInTheDocument()
    expect(await findByText('555-1212')).toBeInTheDocument()
    expect(await findByText('Top customer.')).toBeInTheDocument()
  })

  it('hides the website / phone / address blocks when those fields are missing', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () =>
        HttpResponse.json(
          makeCompanyDetail({
            name: 'Bare Co',
            industry: null,
            website: null,
            phone: null,
            address: null,
            city: null,
            state: null,
            zip: null,
            notes: null,
          }),
        ),
      ),
    )
    const { findByText, queryByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    expect(await findByText('Bare Co')).toBeInTheDocument()
    expect(queryByText('https://acme.example.com')).toBeNull()
    expect(queryByText('Notes')).toBeNull()
  })

  it('renders the address without a comma when city is present but state is missing', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () =>
        HttpResponse.json(
          makeCompanyDetail({
            address: '1 Main St',
            city: 'Austin',
            state: null,
            zip: null,
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    // Wait for the company to load.
    await findByText('Acme Inc')
    // The address block should be visible with city text.
    await waitFor(() => {
      expect(document.body.textContent).toContain('Austin')
      // No comma should appear when state is null.
      expect(document.body.textContent).not.toContain('Austin,')
    })
  })

  it('renders contacts and deals tables when the company has them', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () =>
        HttpResponse.json(
          makeCompanyDetail({
            contacts: [
              makeContact({ id: 11, firstName: 'Linus', lastName: 'Torvalds', email: 'l@k.org', title: 'Maintainer' }),
            ],
            deals: [makeDeal({ id: 33, title: 'Big Deal', value: 9999, stage: 'Won' })],
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    expect(await findByText('Linus Torvalds')).toBeInTheDocument()
    expect(await findByText('l@k.org')).toBeInTheDocument()
    expect(await findByText('Maintainer')).toBeInTheDocument()
    expect(await findByText('Big Deal')).toBeInTheDocument()
    expect(await findByText('Won')).toBeInTheDocument()
  })

  it('renders fallback dashes when contact email or title is missing', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () =>
        HttpResponse.json(
          makeCompanyDetail({
            contacts: [
              makeContact({ id: 12, firstName: 'No', lastName: 'Title', email: null, title: null }),
            ],
          }),
        ),
      ),
    )
    const { container, findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    await findByText('No Title')
    const dashes = (container.textContent ?? '').match(/—/g) ?? []
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('shows empty placeholder text when there are no contacts or deals', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () =>
        HttpResponse.json(makeCompanyDetail({ contacts: [], deals: [] })),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    expect(await findByText('No contacts at this company')).toBeInTheDocument()
    expect(await findByText('No deals with this company')).toBeInTheDocument()
  })

  it('opens the edit dialog when the Edit button is clicked', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () => HttpResponse.json(makeCompanyDetail())),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
    const editBtn = await findByText('Edit')
    await fireEvent.click(editBtn)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Company'))).toBe(true)
    })
  })

  it('opens the confirm dialog and navigates to /companies after delete', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/companies/:id`, () => HttpResponse.json(makeCompanyDetail({ id: 1 }))),
      http.delete(`${API}/companies/1`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const router = makeCompanyRouter()
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
      expect(router.currentRoute.value.name).toBe('companies')
    })
  })

  it('navigates back to the companies list when the back arrow is clicked', async () => {
    server.use(
      http.get(`${API}/companies/:id`, () => HttpResponse.json(makeCompanyDetail())),
    )
    const router = makeCompanyRouter()
    const { container, findByText } = renderWithPlugins(AppWrapped, { router })
    await findByText('Acme Inc')
    const back = container.querySelector('.mdi-arrow-left') as HTMLElement
    expect(back).not.toBeNull()
    await fireEvent.click(back)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('companies')
    })
  })

  it('refetches the company after the form dialog emits saved', async () => {
    let getCount = 0
    server.use(
      http.get(`${API}/companies/:id`, () => {
        getCount++
        return HttpResponse.json(makeCompanyDetail({ id: 1 }))
      }),
      http.put(`${API}/companies/:id`, () => HttpResponse.json(makeCompanyDetail({ id: 1 }))),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeCompanyRouter() })
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

  it('skips the delete API when the company is null at confirm time', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/companies/:id`, () => HttpResponse.json(makeCompanyDetail({ id: 1 }))),
      http.delete(`${API}/companies/1`, () => {
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
    const router = makeCompanyRouter()
    const { findByText, findByTestId } = renderWithPlugins(AppWrapped, {
      router,
      renderOptions: {
        global: {
          stubs: { ConfirmDialog: ConfirmDialogStub },
        },
      },
    })
    await findByText('Acme Inc')
    const fire = await findByTestId('fire-confirm')
    const store = useCompanyStore()
    const deleteSpy = vi.spyOn(store, 'deleteCompany')
    // Null out the company ref so onDelete's early-return runs.
    store.company = null
    await fireEvent.click(fire)
    await new Promise((r) => setTimeout(r, 30))
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(deleteCount).toBe(0)
    expect(router.currentRoute.value.name).not.toBe('companies')
  })
})
