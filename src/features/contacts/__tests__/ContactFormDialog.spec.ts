import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeCompany, makeContact, makeContactDetail, makeTag } from '@/test/fixtures'
import ContactFormDialog from '../ContactFormDialog.vue'

const API = 'http://localhost:5236/api'

/**
 * Test harness that wraps ContactFormDialog in v-app and exposes the
 * `modelValue` and contact props through a parent so we can drive the dialog.
 */
function makeHarness(initial: { modelValue: boolean; contact: any }) {
  const open = ref(initial.modelValue)
  const contact = ref(initial.contact)
  const saved = vi.fn()
  const Harness = defineComponent({
    setup() {
      return () =>
        h(VApp, null, {
          default: () =>
            h(ContactFormDialog, {
              modelValue: open.value,
              contact: contact.value,
              'onUpdate:modelValue': (v: boolean) => (open.value = v),
              onSaved: saved,
            }),
        })
    },
  })
  return { Harness, open, contact, saved }
}

describe('ContactFormDialog', () => {
  it('does not render the form fields when modelValue is false', () => {
    const { Harness } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    // The dialog content (title) should not be in the DOM yet.
    expect(document.body.querySelector('.v-card-title')).toBeNull()
  })

  it('renders the "New Contact" title when no contact is provided', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [makeCompany({ id: 1, name: 'Acme' })], meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([makeTag({ id: 1, name: 'VIP' })])),
    )
    const { Harness, open } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
  })

  it('renders the "Edit Contact" title and pre-fills inputs when a contact is provided', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [makeCompany({ id: 5, name: 'Acme' })], meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open } = makeHarness({
      modelValue: false,
      contact: makeContact({
        id: 42,
        firstName: 'Linus',
        lastName: 'Torvalds',
        email: 'linus@kernel.org',
        phone: '555-9999',
        title: 'Maintainer',
        companyId: 5,
      }),
    })
    renderWithPlugins(Harness)
    // Open the dialog after mount so the modelValue watch fires.
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Contact'))).toBe(true)
    })
    const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    expect(inputs.find((i) => i.value === 'Linus')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'Torvalds')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'linus@kernel.org')).toBeTruthy()
    expect(inputs.find((i) => i.value === '555-9999')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'Maintainer')).toBeTruthy()
  })

  it('falls back to null when a ContactDetail has no company at all', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open } = makeHarness({
      modelValue: false,
      contact: makeContactDetail({
        id: 17,
        firstName: 'NoCo',
        lastName: 'Person',
        company: null,
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'NoCo')).toBeTruthy()
    })
  })

  it('falls back to company.id when companyId is missing on a ContactDetail', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({
          data: [makeCompany({ id: 9, name: 'NestedCo' })],
          meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
        }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open } = makeHarness({
      modelValue: false,
      contact: makeContactDetail({
        id: 7,
        firstName: 'Ada',
        lastName: 'Lovelace',
        company: makeCompany({ id: 9, name: 'NestedCo' }),
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Ada')).toBeTruthy()
    })
  })

  it('emits saved and closes the dialog after creating a new contact', async () => {
    let postBody: unknown = null
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.post(`${API}/contacts`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeContact(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
    // Find the first/last name inputs and fill them.
    const labels = Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement {
      const label = labels.find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement
    }
    await fireEvent.update(inputFor('First Name'), 'Ada')
    await fireEvent.update(inputFor('Last Name'), 'Lovelace')
    // Submit by clicking the "Create" button.
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(postBody).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' })
  })

  it('sends a PUT to /contacts/:id and emits saved when editing a contact', async () => {
    let putBody: unknown = null
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.put(`${API}/contacts/55`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeContact({ id: 55 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      contact: makeContact({ id: 55, firstName: 'Old', lastName: 'Name' }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Old')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(putBody).toMatchObject({ firstName: 'Old', lastName: 'Name' })
  })

  it('closes the dialog without emitting saved when Cancel is clicked', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement
    await fireEvent.click(cancelBtn)
    await waitFor(() => {
      expect(open.value).toBe(false)
    })
    expect(saved).not.toHaveBeenCalled()
  })

  it('reopens the dialog and resets fields back to the new contact values', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open, contact } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    // Initially closed - the watch should not have run.
    open.value = true
    contact.value = makeContact({ id: 12, firstName: 'Initial', lastName: 'Person' })
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Initial')).toBeTruthy()
    })
    // Now switch to a different contact while still open.
    open.value = false
    await waitFor(() => {
      // Closed - dialog hidden
      const overlay = document.body.querySelector('.v-overlay__content') as HTMLElement
      expect(overlay?.style.display).toBe('none')
    })
    contact.value = makeContact({ id: 13, firstName: 'Second', lastName: 'Person' })
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Second')).toBeTruthy()
    })
  })

  it('creates a contact with all optional fields filled and selected tags', async () => {
    let postBody: any = null
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({
          data: [makeCompany({ id: 3, name: 'Acme' })],
          meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
        }),
      ),
      http.get(`${API}/tags`, () =>
        HttpResponse.json([makeTag({ id: 1, name: 'VIP' }), makeTag({ id: 2, name: 'Lead' })]),
      ),
      http.post(`${API}/contacts`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeContact(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    open.value = true
    // Wait for the dialog AND the companies/tags fetches to drain so the
    // selects render their item lists.
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
    // Helper that resolves a label text to its associated input element.
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    // Fill every text field. Each fireEvent.update calls the v-model template setter.
    await fireEvent.update(inputFor('First Name'), 'Ada')
    await fireEvent.update(inputFor('Last Name'), 'Lovelace')
    await fireEvent.update(inputFor('Email'), 'ada@example.com')
    await fireEvent.update(inputFor('Phone'), '555-0001')
    await fireEvent.update(inputFor('Title'), 'Mathematician')
    await fireEvent.update(inputFor('Notes'), 'First programmer')
    // Open the company select and pick "Acme".
    const fields = Array.from(document.body.querySelectorAll('.v-field'))
    const companyField = fields.find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Company',
    ) as HTMLElement
    await fireEvent.mouseDown(companyField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Acme'))).toBe(true)
    })
    const acmeItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Acme'),
    ) as HTMLElement
    await fireEvent.click(acmeItem)
    // Open the Tags select and pick "VIP".
    const tagsField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Tags',
    ) as HTMLElement
    await fireEvent.mouseDown(tagsField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('VIP'))).toBe(true)
    })
    const vipItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('VIP'),
    ) as HTMLElement
    await fireEvent.click(vipItem)
    // Submit.
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
    })
    expect(postBody).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '555-0001',
      title: 'Mathematician',
      notes: 'First programmer',
      companyId: 3,
      tagIds: [1],
    })
  })

  it('updates a contact whose optional fields are empty and sends undefined values', async () => {
    let putBody: any = null
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
      http.put(`${API}/contacts/77`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeContact({ id: 77 }))
      }),
    )
    // Build a contact with explicitly empty/null optional fields so the
    // `value || undefined` fallback branches in onSubmit's edit path are hit.
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      contact: makeContact({
        id: 77,
        firstName: 'Empty',
        lastName: 'Optionals',
        email: null,
        phone: null,
        title: null,
        companyId: null,
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Empty')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
    })
    expect(putBody).toMatchObject({
      firstName: 'Empty',
      lastName: 'Optionals',
    })
    // The optional fields should have been omitted (sent as undefined → not present in the JSON body).
    expect(putBody.email).toBeUndefined()
    expect(putBody.phone).toBeUndefined()
    expect(putBody.title).toBeUndefined()
    expect(putBody.notes).toBeUndefined()
    expect(putBody.companyId).toBeUndefined()
  })

  it('closes the dialog when v-dialog emits update:model-value(false)', async () => {
    server.use(
      http.get(`${API}/companies`, () =>
        HttpResponse.json({ data: [], meta: { currentPage: 1, perPage: 200, total: 0, lastPage: 1 } }),
      ),
      http.get(`${API}/tags`, () => HttpResponse.json([])),
    )
    const { Harness, open } = makeHarness({ modelValue: false, contact: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Contact'))).toBe(true)
    })
    // Vuetify's v-dialog closes when Escape is pressed - it forwards through
    // its @update:model-value handler that ContactFormDialog wires up.
    const overlay = document.body.querySelector('.v-overlay') as HTMLElement
    expect(overlay).not.toBeNull()
    await fireEvent.keyDown(overlay, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(open.value).toBe(false)
    })
  })
})
