import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeActivity, makePaginated } from '@/test/fixtures'
import { useActivityStore } from '@/stores/activity.store'
import ActivityListPage from '../ActivityListPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(ActivityListPage) }),
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
                slots['item.type']?.({ item }),
                slots['item.subject']?.({ item }),
                slots['item.contactName']?.({ item }),
                slots['item.dealTitle']?.({ item }),
                slots['item.occurredAt']?.({ item }),
                slots['item.actions']?.({ item }),
              ],
            ),
          ),
        ),
      ])
  },
})

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/activities', name: 'activities', component: Stub },
      { path: '/contacts/:id', name: 'contact-detail', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
    ],
  })
  router.push('/activities')
  return router
}

function renderPage(router = makeRouter()) {
  return renderWithPlugins(AppWrapped, {
    router,
    renderOptions: {
      global: { stubs: { 'v-data-table-server': VDataTableServerStub } },
    },
  })
}

describe('ActivityListPage', () => {
  it('renders the page header and loads activities', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(makePaginated([makeActivity({ id: 1, subject: 'Kickoff Call' })], { total: 1 })),
      ),
    )
    const { findByText, findByTestId } = renderPage()
    expect(await findByText('Activities')).toBeInTheDocument()
    const stub = await findByTestId('data-table-stub')
    await waitFor(() => {
      expect(stub.textContent).toContain('Kickoff Call')
    })
  })

  it('shows the empty state when there are no activities', async () => {
    server.use(
      http.get(`${API}/activities`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No activities yet')).toBeInTheDocument()
    })
  })

  it('opens the create dialog from the empty state action button', async () => {
    server.use(
      http.get(`${API}/activities`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { queryByText, getAllByText } = renderPage()
    await waitFor(() => {
      expect(queryByText('No activities yet')).toBeInTheDocument()
    })
    const addBtns = getAllByText('Log Activity')
    await fireEvent.click(addBtns[addBtns.length - 1] as HTMLElement)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
  })

  it('renders the activity type icon and text', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(makePaginated([makeActivity({ id: 1, type: 'Call', subject: 'Follow-up' })], { total: 1 })),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    await waitFor(() => {
      expect(row.textContent).toContain('Call')
      expect(row.textContent).toContain('Follow-up')
    })
  })

  it('renders the contact name as a link when contactId is present', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(
          makePaginated([makeActivity({ id: 1, contactId: 5, contactName: 'Alan Turing' })], { total: 1 }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    await waitFor(() => {
      expect(row.textContent).toContain('Alan Turing')
    })
    const link = row.querySelector('a[href*="contacts/5"]')
    expect(link).not.toBeNull()
  })

  it('renders a dash when contactId is absent', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(
          makePaginated([makeActivity({ id: 1, contactId: null, contactName: null })], { total: 1 }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    expect(row.textContent).toContain('—')
  })

  it('renders the deal title as a link when dealId is present', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(
          makePaginated([makeActivity({ id: 1, dealId: 10, dealTitle: 'Big Deal' })], { total: 1 }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    await waitFor(() => {
      expect(row.textContent).toContain('Big Deal')
    })
    const link = row.querySelector('a[href*="deals/10"]')
    expect(link).not.toBeNull()
  })

  it('renders a dash when dealId is absent', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(
          makePaginated([makeActivity({ id: 1, dealId: null, dealTitle: null })], { total: 1 }),
        ),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-1')
    expect((row.textContent ?? '').match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('opens the edit dialog when the pencil icon is clicked', async () => {
    server.use(
      http.get(`${API}/activities`, () =>
        HttpResponse.json(makePaginated([makeActivity({ id: 3, subject: 'Edit Me' })], { total: 1 })),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-3')
    const pencil = row.querySelector('button .mdi-pencil') as HTMLElement
    await fireEvent.click(pencil)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Activity'))).toBe(true)
    })
  })

  it('opens the confirm dialog and deletes the activity', async () => {
    let deleteCount = 0
    let listCount = 0
    server.use(
      http.get(`${API}/activities`, () => {
        listCount++
        return HttpResponse.json(makePaginated([makeActivity({ id: 7, subject: 'Del Me' })], { total: 1 }))
      }),
      http.delete(`${API}/activities/7`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('row-7')
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

  it('filters by activity type', async () => {
    const seen: Array<string | null> = []
    server.use(
      http.get(`${API}/activities`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('type'))
        return HttpResponse.json(makePaginated([makeActivity()], { total: 1 }))
      }),
    )
    const { container } = renderPage()
    await waitFor(() => {
      expect(seen.length).toBeGreaterThanOrEqual(1)
    })
    // Click the type filter select.
    const selectField = container.querySelector('.activities-filters__type .v-field') as HTMLElement
    await fireEvent.mouseDown(selectField)
    await waitFor(() => {
      expect(document.body.querySelector('.v-list-item')).not.toBeNull()
    })
    const items = Array.from(document.body.querySelectorAll('.v-list-item'))
    const callOption = items.find((el) => el.textContent?.includes('Call')) as HTMLElement
    await fireEvent.click(callOption)
    await waitFor(() => {
      expect(seen).toContain('Call')
    })
  })

  it('updates page and perPage when data table emits update:options', async () => {
    const seenPages: Array<string | null> = []
    const seenPerPage: Array<string | null> = []
    server.use(
      http.get(`${API}/activities`, ({ request }) => {
        const url = new URL(request.url)
        seenPages.push(url.searchParams.get('page'))
        seenPerPage.push(url.searchParams.get('perPage'))
        return HttpResponse.json(makePaginated([makeActivity()], { total: 1 }))
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

  it('closes the form and reloads when the form dialog emits saved', async () => {
    let listCount = 0
    server.use(
      http.get(`${API}/activities`, () => {
        listCount++
        return HttpResponse.json(makePaginated([], { total: 0 }))
      }),
    )
    const ActivityFormDialogStub = defineComponent({
      name: 'ActivityFormDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        activity: { type: Object, default: null },
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
      router: makeRouter(),
      renderOptions: {
        global: {
          stubs: {
            'v-data-table-server': VDataTableServerStub,
            ActivityFormDialog: ActivityFormDialogStub,
          },
        },
      },
    })
    await waitFor(() => {
      expect(listCount).toBe(1)
    })
    const headerAdd = getAllByText('Log Activity')[0] as HTMLElement
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
    await fireEvent.click(getAllByText('Log Activity')[0] as HTMLElement)
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    await fireEvent.click(await findByTestId('fire-update-model'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
    })
  })

  it('skips the delete API call when onDelete fires without a target activity', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/activities`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
      http.delete(`${API}/activities/:id`, () => {
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
      router: makeRouter(),
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

  it('skips updating meta when fetchActivities resolves with no meta payload', async () => {
    server.use(
      http.get(`${API}/activities`, () => HttpResponse.json(makePaginated([], { total: 0 }))),
    )
    const { findByText } = renderPage()
    await findByText('Activities')
    const store = useActivityStore()
    const spy = vi.spyOn(store, 'fetchActivities').mockResolvedValueOnce(undefined as never)
    const fireBtn = document.body.querySelector('[data-testid="fire-update-options"]') as HTMLElement
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })
    await nextTick()
  })
})
