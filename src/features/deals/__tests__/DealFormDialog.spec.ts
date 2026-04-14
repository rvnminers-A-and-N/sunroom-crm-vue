import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeCompany, makeContact, makeDeal } from '@/test/fixtures'
import DealFormDialog from '../DealFormDialog.vue'

const API = 'http://localhost:5236/api'

function setupFormHandlers() {
  server.use(
    http.get(`${API}/contacts`, () =>
      HttpResponse.json({
        data: [makeContact({ id: 1, firstName: 'Grace', lastName: 'Hopper' })],
        meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
      }),
    ),
    http.get(`${API}/companies`, () =>
      HttpResponse.json({
        data: [makeCompany({ id: 1, name: 'Acme Inc' })],
        meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
      }),
    ),
  )
}

function makeHarness(initial: { modelValue: boolean; deal: any }) {
  const open = ref(initial.modelValue)
  const deal = ref(initial.deal)
  const saved = vi.fn()
  const Harness = defineComponent({
    setup() {
      return () =>
        h(VApp, null, {
          default: () =>
            h(DealFormDialog, {
              modelValue: open.value,
              deal: deal.value,
              'onUpdate:modelValue': (v: boolean) => (open.value = v),
              onSaved: saved,
            }),
        })
    },
  })
  return { Harness, open, deal, saved }
}

describe('DealFormDialog', () => {
  it('does not render the form fields when modelValue is false', () => {
    setupFormHandlers()
    const { Harness } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    expect(document.body.querySelector('.v-card-title')).toBeNull()
  })

  it('renders the "New Deal" title when no deal is provided', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
  })

  it('renders the "Edit Deal" title and pre-fills inputs when a deal is provided', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({
      modelValue: false,
      deal: makeDeal({
        id: 10,
        title: 'Big Deal',
        value: 25000,
        stage: 'Qualified',
        contactId: 1,
        companyId: 1,
        expectedCloseDate: '2026-06-01T00:00:00.000Z',
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Deal'))).toBe(true)
    })
    const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    expect(inputs.find((i) => i.value === 'Big Deal')).toBeTruthy()
    expect(inputs.find((i) => i.value === '25000')).toBeTruthy()
    expect(inputs.find((i) => i.value === '2026-06-01')).toBeTruthy()
  })

  it('does not submit when title is empty', async () => {
    setupFormHandlers()
    let postCount = 0
    server.use(
      http.post(`${API}/deals`, () => {
        postCount++
        return HttpResponse.json(makeDeal(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(postCount).toBe(0)
    expect(saved).not.toHaveBeenCalled()
  })

  it('emits saved and closes the dialog after creating a new deal with all fields', async () => {
    setupFormHandlers()
    let postBody: any = null
    server.use(
      http.post(`${API}/deals`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeDeal(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    await fireEvent.update(inputFor('Title'), 'New Enterprise Deal')
    // The value input is type="number" - find it directly.
    const numberInput = document.body.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(numberInput, '50000')
    const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement
    await fireEvent.update(dateInput, '2026-12-31')
    await fireEvent.update(inputFor('Notes'), 'Important deal notes')
    // Select a contact.
    const fields = Array.from(document.body.querySelectorAll('.v-field'))
    const contactField = fields.find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Contact',
    ) as HTMLElement
    await fireEvent.mouseDown(contactField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Grace Hopper'))).toBe(true)
    })
    const graceItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Grace Hopper'),
    ) as HTMLElement
    await fireEvent.click(graceItem)
    // Select a company.
    const companyField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Company',
    ) as HTMLElement
    await fireEvent.mouseDown(companyField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Acme Inc'))).toBe(true)
    })
    const acmeItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Acme Inc'),
    ) as HTMLElement
    await fireEvent.click(acmeItem)
    // Submit.
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(postBody).toMatchObject({
      title: 'New Enterprise Deal',
      contactId: 1,
      companyId: 1,
      notes: 'Important deal notes',
    })
  })

  it('sends a PUT to /deals/:id and emits saved when editing a deal', async () => {
    setupFormHandlers()
    let putBody: any = null
    server.use(
      http.put(`${API}/deals/55`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeDeal({ id: 55 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      deal: makeDeal({ id: 55, title: 'Old Title', value: 1000, contactId: 1 }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Old Title')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(putBody).toMatchObject({ title: 'Old Title', contactId: 1 })
  })

  it('updates a deal with empty optional fields and sends undefined values', async () => {
    setupFormHandlers()
    let putBody: any = null
    server.use(
      http.put(`${API}/deals/77`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeDeal({ id: 77 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      deal: makeDeal({
        id: 77,
        title: 'EmptyOptionals',
        value: 100,
        contactId: 1,
        companyId: null,
        expectedCloseDate: null,
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'EmptyOptionals')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
    })
    expect(putBody).toMatchObject({ title: 'EmptyOptionals' })
    expect(putBody.companyId).toBeUndefined()
    expect(putBody.expectedCloseDate).toBeUndefined()
    expect(putBody.notes).toBeUndefined()
  })

  it('shows validation error when value is negative', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
    const numberInput = document.body.querySelector('input[type="number"]') as HTMLInputElement
    await fireEvent.update(numberInput, '-1')
    // Trigger blur to validate.
    await fireEvent.blur(numberInput)
    await waitFor(() => {
      expect(document.body.textContent).toContain('Must be positive')
    })
  })

  it('allows changing the stage via the dropdown', async () => {
    setupFormHandlers()
    let postBody: any = null
    server.use(
      http.post(`${API}/deals`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeDeal(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
    // Fill required fields.
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    await fireEvent.update(inputFor('Title'), 'Stage Test Deal')
    // Select a contact.
    const fields = Array.from(document.body.querySelectorAll('.v-field'))
    const contactField = fields.find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Contact',
    ) as HTMLElement
    await fireEvent.mouseDown(contactField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Grace Hopper'))).toBe(true)
    })
    const graceItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Grace Hopper'),
    ) as HTMLElement
    await fireEvent.click(graceItem)
    // Change stage from default Lead to Qualified.
    const stageField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Stage',
    ) as HTMLElement
    await fireEvent.mouseDown(stageField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Qualified'))).toBe(true)
    })
    const qualifiedItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Qualified'),
    ) as HTMLElement
    await fireEvent.click(qualifiedItem)
    // Submit.
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
    })
    expect(postBody).toMatchObject({ title: 'Stage Test Deal', stage: 'Qualified' })
  })

  it('closes the dialog without emitting saved when Cancel is clicked', async () => {
    setupFormHandlers()
    const { Harness, open, saved } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
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

  it('closes the dialog when v-dialog emits update:model-value(false)', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
    const overlay = document.body.querySelector('.v-overlay') as HTMLElement
    await fireEvent.keyDown(overlay, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(open.value).toBe(false)
    })
  })

  it('reopens the dialog and resets fields for a different deal', async () => {
    setupFormHandlers()
    const { Harness, open, deal } = makeHarness({ modelValue: false, deal: null })
    renderWithPlugins(Harness)
    open.value = true
    deal.value = makeDeal({ id: 12, title: 'First Deal' })
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'First Deal')).toBeTruthy()
    })
    open.value = false
    await waitFor(() => {
      const overlay = document.body.querySelector('.v-overlay__content') as HTMLElement
      expect(overlay?.style.display).toBe('none')
    })
    deal.value = makeDeal({ id: 13, title: 'Second Deal' })
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Second Deal')).toBeTruthy()
    })
  })
})
