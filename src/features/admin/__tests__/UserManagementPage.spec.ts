import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeUser, makeAdmin } from '@/test/fixtures'
import { useAuthStore } from '@/stores/auth.store'
import UserManagementPage from '../UserManagementPage.vue'

const API = 'http://localhost:5236/api'

const VDataTableStub = defineComponent({
  name: 'VDataTableStub',
  props: {
    headers: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'users-table' },
        (props.items as Array<{ id: number }>).map((item) =>
          h('div', { key: item.id, 'data-testid': `user-${item.id}` }, [
            slots['item.name']?.({ item }),
            slots['item.role']?.({ item }),
            slots['item.createdAt']?.({ item }),
            slots['item.actions']?.({ item }),
          ]),
        ),
      )
  },
})

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(UserManagementPage) }),
})

function renderPage() {
  return renderWithPlugins(AppWrapped, {
    renderOptions: {
      global: { stubs: { 'v-data-table': VDataTableStub } },
    },
  })
}

describe('UserManagementPage', () => {
  it('renders the page header and loads users', async () => {
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser(), makeAdmin()])),
    )
    const { findByText } = renderPage()
    expect(await findByText('User Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Ada Lovelace')
      expect(document.body.textContent).toContain('Admin User')
    })
  })

  it('shows "You" chip for the current authenticated user', async () => {
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser({ id: 1 })])),
    )
    renderPage()
    const authStore = useAuthStore()
    authStore.user = makeUser({ id: 1 })
    await waitFor(() => {
      expect(document.body.textContent).toContain('You')
    })
  })

  it('calls updateUser when the role is changed', async () => {
    let putBody: any = null
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser({ id: 5, name: 'Bob' })])),
      http.put(`${API}/admin/users/5`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeUser({ id: 5, role: 'Admin' }))
      }),
    )
    const { findByTestId } = renderPage()
    const userRow = await findByTestId('user-5')
    // The role select is in the item.role slot.
    const selectField = userRow.querySelector('.v-field') as HTMLElement
    await fireEvent.mouseDown(selectField)
    await waitFor(() => {
      expect(document.body.querySelector('.v-list-item')).not.toBeNull()
    })
    const adminOption = Array.from(document.body.querySelectorAll('.v-list-item')).find(
      (el) => el.textContent?.includes('Admin'),
    ) as HTMLElement
    await fireEvent.click(adminOption)
    await waitFor(() => {
      expect(putBody).not.toBeNull()
      expect(putBody.role).toBe('Admin')
    })
  })

  it('opens the confirm dialog and deletes a user', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser({ id: 8, name: 'Delete Me' })])),
      http.delete(`${API}/admin/users/8`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('user-8')
    const deleteBtn = row.querySelector('button .mdi-delete') as HTMLElement
    await fireEvent.click(deleteBtn)
    await waitFor(() => {
      const btns = Array.from(document.body.querySelectorAll('button'))
      expect(btns.find((b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'))).toBeTruthy()
    })
    const confirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.classList.contains('bg-error'),
    ) as HTMLButtonElement
    await fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(deleteCount).toBe(1)
    })
  })

  it('skips delete when deletingUser is null at confirm time', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json([])),
      http.delete(`${API}/admin/users/:id`, () => {
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
      renderOptions: {
        global: { stubs: { 'v-data-table': VDataTableStub, ConfirmDialog: ConfirmDialogStub } },
      },
    })
    await fireEvent.click(await findByTestId('fire-confirm'))
    await new Promise((r) => setTimeout(r, 50))
    expect(deleteCount).toBe(0)
  })

  it('renders the initials avatar and date for each user', async () => {
    server.use(
      http.get(`${API}/admin/users`, () =>
        HttpResponse.json([makeUser({ id: 1, name: 'Ada Lovelace', createdAt: '2026-01-15T00:00:00.000Z' })]),
      ),
    )
    const { findByTestId } = renderPage()
    const row = await findByTestId('user-1')
    expect(row.textContent).toContain('AL')
    // formatDate should render something.
    expect(row.textContent).toMatch(/\d/)
  })
})
