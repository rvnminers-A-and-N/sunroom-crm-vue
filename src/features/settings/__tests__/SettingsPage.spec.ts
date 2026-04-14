import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeTag, makeUser } from '@/test/fixtures'
import { useAuthStore } from '@/stores/auth.store'
import SettingsPage from '../SettingsPage.vue'

const API = 'http://localhost:5236/api'

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(SettingsPage) }),
})

function renderPage() {
  return renderWithPlugins(AppWrapped)
}

function setupAuth() {
  const authStore = useAuthStore()
  authStore.user = makeUser({ id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'Admin' })
}

describe('SettingsPage', () => {
  it('renders the page header and profile card', async () => {
    server.use(http.get(`${API}/tags`, () => HttpResponse.json([])))
    const result = renderPage()
    setupAuth()
    const { findByText } = result
    expect(await findByText('Settings')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Ada Lovelace')
      expect(document.body.textContent).toContain('ada@example.com')
      expect(document.body.textContent).toContain('Admin')
      expect(document.body.textContent).toContain('AL')
    })
  })

  it('renders the tags management section with existing tags', async () => {
    server.use(
      http.get(`${API}/tags`, () =>
        HttpResponse.json([makeTag({ id: 1, name: 'VIP', color: '#02795f' })]),
      ),
    )
    const result = renderPage()
    setupAuth()
    const { findByText } = result
    expect(await findByText('Tags')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
      expect(document.body.textContent).toContain('#02795f')
    })
  })

  it('shows "No tags yet" when tag list is empty', async () => {
    server.use(http.get(`${API}/tags`, () => HttpResponse.json([])))
    renderPage()
    setupAuth()
    await waitFor(() => {
      expect(document.body.textContent).toContain('No tags yet')
    })
  })

  it('creates a new tag when Add button is clicked', async () => {
    let postBody: any = null
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.post(`${API}/tags`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeTag({ id: 2, name: 'Important', color: '#02795F' }))
      }),
    )
    const result = renderPage()
    setupAuth()
    const { findByText, container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('No tags yet')
    })
    const input = container.querySelector('.tag-create__input input') as HTMLInputElement
    await fireEvent.update(input, 'Important')
    const addBtn = await findByText('Add')
    await fireEvent.click(addBtn)
    await waitFor(() => {
      expect(postBody).not.toBeNull()
      expect(postBody.name).toBe('Important')
      expect(postBody.color).toBe('#02795F')
    })
  })

  it('creates a tag via Enter key in the input', async () => {
    let postBody: any = null
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.post(`${API}/tags`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeTag({ id: 3, name: 'Urgent' }))
      }),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('No tags yet')
    })
    const input = container.querySelector('.tag-create__input input') as HTMLInputElement
    await fireEvent.update(input, 'Urgent')
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    await waitFor(() => {
      expect(postBody).not.toBeNull()
      expect(postBody.name).toBe('Urgent')
    })
  })

  it('does not create a tag when name is empty', async () => {
    let postCount = 0
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.post(`${API}/tags`, () => {
        postCount++
        return HttpResponse.json(makeTag())
      }),
    )
    const result = renderPage()
    setupAuth()
    const { findByText } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('No tags yet')
    })
    const addBtn = await findByText('Add')
    await fireEvent.click(addBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(postCount).toBe(0)
  })

  it('starts editing a tag, changes name and color, and saves', async () => {
    let putBody: any = null
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP', color: '#02795f' })])),
      http.put(`${API}/tags/1`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeTag({ id: 1, name: 'Priority', color: '#dc2626' }))
      }),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
    })
    // Click the pencil button to start editing.
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    await waitFor(() => {
      expect(container.querySelector('.tag-list__edit-input')).not.toBeNull()
    })
    // Update the name.
    const editInput = container.querySelector('.tag-list__edit-input input') as HTMLInputElement
    await fireEvent.update(editInput, 'Priority')
    // Click check to save.
    const checkBtn = container.querySelector('.mdi-check') as HTMLElement
    await fireEvent.click(checkBtn)
    await waitFor(() => {
      expect(putBody).not.toBeNull()
      expect(putBody.name).toBe('Priority')
    })
  })

  it('saves the tag via Enter key in edit mode', async () => {
    let putBody: any = null
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 2, name: 'Hot' })])),
      http.put(`${API}/tags/2`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeTag({ id: 2, name: 'Cold' }))
      }),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('Hot')
    })
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    const editInput = container.querySelector('.tag-list__edit-input input') as HTMLInputElement
    await fireEvent.update(editInput, 'Cold')
    await fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' })
    await waitFor(() => {
      expect(putBody).not.toBeNull()
      expect(putBody.name).toBe('Cold')
    })
  })

  it('cancels editing when close icon is clicked', async () => {
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP' })])),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
    })
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    await waitFor(() => {
      expect(container.querySelector('.tag-list__edit-input')).not.toBeNull()
    })
    const closeBtn = container.querySelector('.mdi-close') as HTMLElement
    await fireEvent.click(closeBtn)
    await waitFor(() => {
      expect(container.querySelector('.tag-list__edit-input')).toBeNull()
    })
  })

  it('cancels editing via Escape key', async () => {
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP' })])),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
    })
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    const editInput = container.querySelector('.tag-list__edit-input input') as HTMLInputElement
    await fireEvent.keyDown(editInput, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(container.querySelector('.tag-list__edit-input')).toBeNull()
    })
  })

  it('deletes a tag after confirming', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 5, name: 'ToDelete' })])),
      http.delete(`${API}/tags/5`, () => {
        deleteCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('ToDelete')
    })
    const deleteBtn = container.querySelector('.mdi-delete') as HTMLElement
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

  it('skips delete when deletingTag is null at confirm time', async () => {
    let deleteCount = 0
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.delete(`${API}/tags/:id`, () => {
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
        global: { stubs: { ConfirmDialog: ConfirmDialogStub } },
      },
    })
    setupAuth()
    await fireEvent.click(await findByTestId('fire-confirm'))
    await new Promise((r) => setTimeout(r, 50))
    expect(deleteCount).toBe(0)
  })

  it('does not save edit when editingTag is null or name is empty', async () => {
    let putCount = 0
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP' })])),
      http.put(`${API}/tags/:id`, () => {
        putCount++
        return HttpResponse.json(makeTag())
      }),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
    })
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    // Clear the name and try to save.
    const editInput = container.querySelector('.tag-list__edit-input input') as HTMLInputElement
    await fireEvent.update(editInput, '')
    const checkBtn = container.querySelector('.mdi-check') as HTMLElement
    await fireEvent.click(checkBtn)
    await new Promise((r) => setTimeout(r, 50))
    expect(putCount).toBe(0)
  })

  it('selects a color preset swatch', async () => {
    server.use(http.get(`${API}/tags`, () => HttpResponse.json([])))
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(container.querySelector('.color-presets')).not.toBeNull()
    })
    const swatches = container.querySelectorAll('.color-presets__swatch')
    // Click the second swatch (#2563eb).
    await fireEvent.click(swatches[1] as HTMLElement)
    // The active class should be applied.
    await waitFor(() => {
      expect(swatches[1].classList.contains('color-presets__swatch--active')).toBe(true)
    })
  })

  it('updates newTagColor via the native color input', async () => {
    server.use(http.get(`${API}/tags`, () => HttpResponse.json([])))
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(container.querySelector('.tag-create__color')).not.toBeNull()
    })
    const colorInput = container.querySelector('.tag-create__color') as HTMLInputElement
    await fireEvent.update(colorInput, '#dc2626')
    expect(colorInput.value).toBe('#dc2626')
  })

  it('updates editColor via the native color input in edit mode', async () => {
    server.use(
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP', color: '#02795f' })])),
    )
    const result = renderPage()
    setupAuth()
    const { container } = result
    await waitFor(() => {
      expect(document.body.textContent).toContain('VIP')
    })
    const pencilBtn = container.querySelector('.mdi-pencil') as HTMLElement
    await fireEvent.click(pencilBtn)
    await waitFor(() => {
      expect(container.querySelectorAll('.tag-create__color').length).toBe(2)
    })
    // The second color input is the edit one.
    const editColorInput = container.querySelectorAll('.tag-create__color')[1] as HTMLInputElement
    await fireEvent.update(editColorInput, '#7c3aed')
    expect(editColorInput.value).toBe('#7c3aed')
  })
})
