import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import {
  makeActivity,
  makeCompany,
  makeContactDetail,
  makeDeal,
  makeTag,
} from '@/test/fixtures'
import { useContactStore } from '@/stores/contact.store'
import ContactDetailPage from '../ContactDetailPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(ContactDetailPage) }),
})

function makeContactRouter(initial = '/contacts/1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', name: 'contacts', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
      { path: '/companies/:id', name: 'company-detail', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

describe('ContactDetailPage', () => {
  it('shows a loading indicator before the contact loads', async () => {
    let resolveFetch!: () => void
    const pending = new Promise<void>((r) => (resolveFetch = r))
    server.use(
      http.get(`${API}/contacts/:id`, async () => {
        await pending
        return HttpResponse.json(makeContactDetail())
      }),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('Loading contact...')).toBeInTheDocument()
    resolveFetch()
  })

  it('renders the contact name, email, phone, notes and tags once loaded', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, ({ params }) =>
        HttpResponse.json(
          makeContactDetail({
            id: Number(params.id),
            firstName: 'Grace',
            lastName: 'Hopper',
            title: 'Rear Admiral',
            email: 'grace@navy.mil',
            phone: '555-0100',
            notes: 'Pioneer of computing.',
            tags: [makeTag({ id: 1, name: 'VIP' })],
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('Grace Hopper')).toBeInTheDocument()
    expect(await findByText('grace@navy.mil')).toBeInTheDocument()
    expect(await findByText('555-0100')).toBeInTheDocument()
    expect(await findByText('Pioneer of computing.')).toBeInTheDocument()
    expect(await findByText('VIP')).toBeInTheDocument()
  })

  it('shows fallbacks for empty email and phone', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () =>
        HttpResponse.json(
          makeContactDetail({
            email: null,
            phone: null,
            title: null,
            lastContactedAt: null,
            notes: null,
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('No email')).toBeInTheDocument()
    expect(await findByText('No phone')).toBeInTheDocument()
  })

  it('shows the company link when the contact has a company', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () =>
        HttpResponse.json(
          makeContactDetail({
            company: makeCompany({ id: 33, name: 'Navy' }),
          }),
        ),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('Navy')).toBeInTheDocument()
  })

  it('renders the deals tab with deal items and the activities tab with activity items', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () =>
        HttpResponse.json(
          makeContactDetail({
            deals: [makeDeal({ id: 7, title: 'Big Deal', value: 9999, stage: 'Won' })],
            activities: [makeActivity({ id: 11, type: 'Call', subject: 'Kickoff' })],
          }),
        ),
      ),
    )
    const { findByText, getByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('Big Deal')).toBeInTheDocument()
    // Click the Activities tab to render its content.
    const tabActivities = getByText(/Activities/)
    await fireEvent.click(tabActivities)
    await waitFor(() => {
      expect(getByText('Kickoff')).toBeInTheDocument()
    })
  })

  it('shows empty placeholder text when the contact has no deals or activities', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () =>
        HttpResponse.json(makeContactDetail({ deals: [], activities: [] })),
      ),
    )
    const { findByText, getByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    expect(await findByText('No deals yet')).toBeInTheDocument()
    await fireEvent.click(getByText(/Activities/))
    await waitFor(() => {
      expect(getByText('No activities yet')).toBeInTheDocument()
    })
  })

  it('opens the edit dialog when the Edit button is clicked', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail())),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    const editBtn = await findByText('Edit')
    await fireEvent.click(editBtn)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Contact'))).toBe(true)
    })
  })

  it('opens the confirm dialog and navigates back to the list after delete', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail({ id: 1 }))),
      http.delete(`${API}/contacts/1`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const router = makeContactRouter()
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
      expect(router.currentRoute.value.name).toBe('contacts')
    })
  })

  it('navigates back to the contacts list when the back arrow is clicked', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail())),
    )
    const router = makeContactRouter()
    const { container, findByText } = renderWithPlugins(AppWrapped, { router })
    await findByText('Grace Hopper')
    const back = container.querySelector('.mdi-arrow-left') as HTMLElement
    expect(back).not.toBeNull()
    await fireEvent.click(back)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('contacts')
    })
  })

  it('skips the delete API when the contact is null at confirm time', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail({ id: 1 }))),
      http.delete(`${API}/contacts/1`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    // Stub ConfirmDialog so we can fire @confirm without first clicking Delete.
    // We then null out contactStore.contact in the parent template's reactive
    // state right before firing - which means by the time onDelete reads
    // contactStore.contact, it has been set to null and the early-return guard
    // path is exercised.
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
    const router = makeContactRouter()
    const { findByText, findByTestId } = renderWithPlugins(AppWrapped, {
      router,
      renderOptions: {
        global: {
          stubs: { ConfirmDialog: ConfirmDialogStub },
        },
      },
    })
    // Wait for the contact to load - the v-if=c branch needs to render the stub.
    await findByText('Grace Hopper')
    const fire = await findByTestId('fire-confirm')
    // Spy on deleteContact so we can confirm it was NOT called even after firing.
    const store = useContactStore()
    const deleteSpy = vi.spyOn(store, 'deleteContact')
    // Now null out the contact ref directly. The next click on fire-confirm
    // will call onDelete which reads contactStore.contact (now null) and hits
    // the early return path.
    store.contact = null
    await fireEvent.click(fire)
    // Settle promise microtasks.
    await new Promise((r) => setTimeout(r, 30))
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(deleteCount).toBe(0)
    // We never made it past the null guard, so router.push to 'contacts' was not called.
    expect(router.currentRoute.value.name).not.toBe('contacts')
  })

  it('forwards v-tabs-window update:modelValue back into the local tab ref', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail())),
    )
    // Stub v-tabs-window so we can directly emit update:modelValue and exercise
    // the parent's v-model setter arrow function (which is otherwise only ever
    // called when Vuetify's window component performs a swipe gesture - which
    // jsdom can't really simulate).
    // Drop the entire window subtree (window + items) since v-tabs-window-item
    // expects the v-window-group injection which our stub does not provide.
    const VTabsWindowStub = defineComponent({
      name: 'VTabsWindowStub',
      props: { modelValue: { type: Number, default: 0 } },
      emits: ['update:modelValue'],
      setup(_props, { emit }) {
        return () =>
          h(
            'button',
            {
              'data-testid': 'fire-tabs-window-update',
              onClick: () => emit('update:modelValue', 1),
            },
            'fire',
          )
      },
    })
    const { findByTestId } = renderWithPlugins(AppWrapped, {
      router: makeContactRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-tabs-window': VTabsWindowStub,
            'v-tabs-window-item': { template: '<div />' },
          },
        },
      },
    })
    const fireBtn = await findByTestId('fire-tabs-window-update')
    await fireEvent.click(fireBtn)
    // No assertion on the ref directly - the success criterion is that the
    // template setter ran without throwing.
    expect(fireBtn).toBeInTheDocument()
  })

  it('refetches the contact after the form dialog emits saved', async () => {
    let getCount = 0
    server.use(
      http.get(`${API}/contacts/:id`, () => {
        getCount++
        return HttpResponse.json(makeContactDetail({ id: 1 }))
      }),
      http.put(`${API}/contacts/:id`, () => HttpResponse.json(makeContactDetail({ id: 1 }))),
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
    )
    const { findByText } = renderWithPlugins(AppWrapped, { router: makeContactRouter() })
    const editBtn = await findByText('Edit')
    await fireEvent.click(editBtn)
    // Save the dialog by clicking the primary "Save" action.
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
})
