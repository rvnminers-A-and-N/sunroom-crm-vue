import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import {
  makeContact,
  makePaginated,
  makeTag,
} from '@/test/fixtures'
import { useContactStore } from '@/stores/contact.store'
import ContactListPage from '../ContactListPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(ContactListPage) }),
})

/**
 * Replace the heavy v-data-table-server with a tiny stub that:
 *  - Renders each item using the `item.name` slot so cell text shows up
 *  - Exposes `actions` slot per row
 *  - Forwards `@click:row` and `@update:options`
 * This isolates the page logic from the giant Vuetify table component, which
 * does not behave well in jsdom (no layout) and is already extensively tested
 * by Vuetify itself.
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
                // Invoke every column slot so the inline render functions are exercised.
                slots['item.name']?.({ item }),
                slots['item.email']?.({ item }),
                slots['item.phone']?.({ item }),
                slots['item.companyName']?.({ item }),
                slots['item.tags']?.({ item }),
                slots['item.actions']?.({ item }),
              ],
            ),
          ),
        ),
      ])
  },
})

function makeContactsRouter(initial = '/contacts') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', name: 'contacts', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

function renderPage(router = makeContactsRouter()) {
  return renderWithPlugins(AppWrapped, {
    router,
    renderOptions: {
      global: {
        stubs: { 'v-data-table-server': VDataTableServerStub },
      },
    },
  })
}

describe('ContactListPage', () => {
  it('renders the page header and loads the first page of contacts', async () => {
    server.use(
      http.get(`${API}/contacts`, () =>
        HttpResponse.json(
          makePaginated([makeContact({ id: 1, firstName: 'Grace', lastName: 'Hopper' })], {
            total: 1,
          }),
        ),
      ),
    )
    const { findByText, findByTestId } = renderPage()
    expect(await findByText('Contacts')).toBeInTheDocument()
    const stub = await findByTestId('data-table-stub')
    await waitFor(() => {
      expect(stub.textContent).toContain('Grace Hopper')
    })
  })

  it('shows the empty state when there are no contacts', async () => {
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No contacts yet')).toBeInTheDocument()
    })
  })

  it('shows the empty state action button which opens the create dialog', async () => {
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText, getAllByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No contacts yet')).toBeInTheDocument()
    })
    // The empty state has an "Add Contact" button. Click the last match (page header also has one).
    const addButtons = getAllByText('Add Contact')
    await fireEvent.click(addButtons[addButtons.length - 1] as HTMLElement)
    await waitFor(() => {
      const dialogTitles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(dialogTitles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
  })

  it('debounces search input and refetches with the new search query', async () => {
    vi.useFakeTimers()
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeContact()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    // Wait for the initial fetch to drain so we have a baseline.
    await vi.waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    await fireEvent.update(input, 'grace')
    // Search debounces by 300ms - advance fake timers past it.
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seen).toContain('grace')
    })
    vi.useRealTimers()
  })

  it('refetches with the selected tagId when the tag filter changes', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 7, name: 'VIP' })])),
      http.get(`${API}/contacts`, ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.searchParams.get('tagId'))
        return HttpResponse.json(makePaginated([makeContact()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    await waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    // Vuetify v-select renders a hidden <select> for native fallback only sometimes; instead
    // we go through the activator click + listbox option click pattern.
    const selectActivator = container.querySelectorAll('.v-field')[1] as HTMLElement
    await fireEvent.mouseDown(selectActivator)
    await waitFor(() => {
      expect(document.body.querySelector('.v-list-item')).not.toBeNull()
    })
    const items = Array.from(document.body.querySelectorAll('.v-list-item'))
    const vipOption = items.find((el) => el.textContent?.includes('VIP')) as HTMLElement
    await fireEvent.click(vipOption)
    await waitFor(() => {
      expect(seen).toContain('7')
    })
  })

  it('navigates to the contact detail route when a row is clicked', async () => {
    server.use(
      http.get(`${API}/contacts`, () =>
        HttpResponse.json(
          makePaginated([makeContact({ id: 42, firstName: 'Ada', lastName: 'Lovelace' })], {
            total: 1,
          }),
        ),
      ),
    )
    const router = makeContactsRouter()
    const { findByTestId } = renderPage(router)
    const row = await findByTestId('row-42')
    await fireEvent.click(row)
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('contact-detail')
      expect(router.currentRoute.value.params.id).toBe('42')
    })
  })

  it('opens the edit dialog when the row pencil icon is clicked', async () => {
    server.use(
      http.get(`${API}/contacts`, () =>
        HttpResponse.json(
          makePaginated([makeContact({ id: 5, firstName: 'Linus', lastName: 'Torvalds' })], {
            total: 1,
          }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-5')
    const pencil = row.querySelector('button .mdi-pencil') as HTMLElement
    expect(pencil).not.toBeNull()
    await fireEvent.click(pencil)
    await waitFor(() => {
      const dialogTitles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(dialogTitles.some((t) => t.textContent?.includes('Edit Contact'))).toBe(true)
    })
  })

  it('opens the confirm dialog and deletes the contact when confirmed', async () => {
    let deleteCount = 0
    let listCount = 0
    server.use(
      http.get(`${API}/contacts`, () => {
        listCount++
        return HttpResponse.json(
          makePaginated([makeContact({ id: 9, firstName: 'Grace', lastName: 'Hopper' })], {
            total: 1,
          }),
        )
      }),
      http.delete(`${API}/contacts/9`, () => {
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
      // The ConfirmDialog primary action is labelled "Delete".
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
    // After delete, the list reloads.
    await waitFor(() => {
      expect(listCount).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows fallback dashes for missing email, phone and company name', async () => {
    server.use(
      http.get(`${API}/contacts`, () =>
        HttpResponse.json(
          makePaginated(
            [
              makeContact({
                id: 1,
                firstName: 'No',
                lastName: 'Data',
                title: null,
                email: null,
                phone: null,
                companyName: null,
                tags: [],
              }),
            ],
            { total: 1 },
          ),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    // Each empty column slot should render an em-dash fallback.
    expect((row.textContent ?? '').match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('closes the form and reloads contacts when the form dialog emits saved', async () => {
    let listCount = 0
    server.use(
      http.get(`${API}/contacts`, () => {
        listCount++
        return HttpResponse.json(makePaginated([], { total: 0 }))
      }),
    )
    // Stub ContactFormDialog so we can fire @saved on demand and verify the
    // parent's onFormSaved handler closes the dialog and refetches the list.
    const ContactFormDialogStub = defineComponent({
      name: 'ContactFormDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        contact: { type: Object, default: null },
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
      router: makeContactsRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-data-table-server': VDataTableServerStub,
            ContactFormDialog: ContactFormDialogStub,
          },
        },
      },
    })
    // Wait for initial fetch to complete.
    await waitFor(() => {
      expect(listCount).toBe(1)
    })
    // Open the form via header action - parent should pass modelValue=true to the stub.
    const headerAdd = getAllByText('Add Contact')[0] as HTMLElement
    await fireEvent.click(headerAdd)
    const stub = await findByTestId('form-dialog-stub')
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    // Now fire saved from the stub - this should call onFormSaved on the parent.
    const fireSaved = await findByTestId('fire-saved')
    await fireEvent.click(fireSaved)
    // The parent should: close the dialog AND refetch.
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
      expect(listCount).toBe(2)
    })
    // Re-open and dismiss via update:modelValue to exercise the v-model setter.
    const headerAdd2 = getAllByText('Add Contact')[0] as HTMLElement
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

  it('clears the search field and refetches with no search query', async () => {
    const seenSearches: Array<string | null> = []
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const url = new URL(request.url)
        seenSearches.push(url.searchParams.get('search'))
        return HttpResponse.json(makePaginated([makeContact()], { total: 1 }))
      }),
    )
    vi.useFakeTimers()
    const { container } = renderPage()
    await vi.waitFor(() => {
      expect(seenSearches.length).toBeGreaterThanOrEqual(1)
    })
    const input = container.querySelector('input[type="text"]') as HTMLInputElement
    // Type something then clear it via the v-text-field clearable button.
    await fireEvent.update(input, 'grace')
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      expect(seenSearches).toContain('grace')
    })
    // Click the clear button which dispatches update:model-value with null.
    const clearBtn = container.querySelector('.v-field__clearable .v-icon') as HTMLElement
    await fireEvent.click(clearBtn)
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => {
      // The clear should have triggered onSearch with null which falls back to ''.
      // The store passes search: undefined when value is empty, so the URL has no search param.
      const lastValues = seenSearches.slice(-2)
      expect(lastValues.some((v) => v === null)).toBe(true)
    })
    vi.useRealTimers()
  })

  it('skips the delete API call when onDelete fires without a target contact', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
      http.delete(`${API}/contacts/:id`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    // Stub ConfirmDialog so we can fire @confirm directly without first
    // calling confirmDelete (which sets deletingContact). This exercises the
    // null guard branch in the parent's onDelete handler.
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
      router: makeContactsRouter(),
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
    // The delete request should NOT have been made because deletingContact is null.
    await new Promise((r) => setTimeout(r, 50))
    expect(deleteCount).toBe(0)
  })

  it('skips updating meta when fetchContacts resolves with no meta payload', async () => {
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { findByText } = renderPage()
    // Wait for the page header to mount so the store is active.
    await findByText('Contacts')
    // Stub fetchContacts so its next resolution returns undefined - this hits
    // the false branch of `if (m) meta.value = m` in loadContacts.then.
    const store = useContactStore()
    const spy = vi.spyOn(store, 'fetchContacts').mockResolvedValueOnce(undefined as never)
    // Trigger a reload via the data-table stub fire button.
    const fireBtn = document.body.querySelector('[data-testid="fire-update-options"]') as HTMLElement
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    // Allow the .then callback to run.
    await nextTick()
  })

  it('updates page and perPage when the data table emits update:options', async () => {
    const seenPages: Array<string | null> = []
    const seenPerPage: Array<string | null> = []
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const url = new URL(request.url)
        seenPages.push(url.searchParams.get('page'))
        seenPerPage.push(url.searchParams.get('perPage'))
        return HttpResponse.json(makePaginated([makeContact()], { total: 1 }))
      }),
    )
    const { findByTestId } = renderPage()
    // Wait for initial onMounted fetch to drain.
    await waitFor(() => {
      expect(seenPages).toContain('1')
    })
    // Now manually fire update:options through the stub's "fire" button.
    const fireBtn = await findByTestId('fire-update-options')
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(seenPages).toContain('2')
      expect(seenPerPage).toContain('25')
    })
  })
})
