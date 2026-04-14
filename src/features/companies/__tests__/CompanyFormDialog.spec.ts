import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeCompany, makeCompanyDetail } from '@/test/fixtures'
import CompanyFormDialog from '../CompanyFormDialog.vue'

const API = 'http://localhost:5236/api'

/**
 * Test harness wrapping CompanyFormDialog inside v-app, with reactive refs for
 * `modelValue` and `company` so we can drive the dialog open/closed and swap
 * out the company prop. Starts closed so the watch on modelValue actually
 * fires when we set open=true after mount.
 */
function makeHarness(initial: { modelValue: boolean; company: any }) {
  const open = ref(initial.modelValue)
  const company = ref(initial.company)
  const saved = vi.fn()
  const Harness = defineComponent({
    setup() {
      return () =>
        h(VApp, null, {
          default: () =>
            h(CompanyFormDialog, {
              modelValue: open.value,
              company: company.value,
              'onUpdate:modelValue': (v: boolean) => (open.value = v),
              onSaved: saved,
            }),
        })
    },
  })
  return { Harness, open, company, saved }
}

describe('CompanyFormDialog', () => {
  it('does not render the form fields when modelValue is false', () => {
    const { Harness } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    expect(document.body.querySelector('.v-card-title')).toBeNull()
  })

  it('renders the "New Company" title when no company is provided', async () => {
    const { Harness, open } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
    })
  })

  it('renders the "Edit Company" title and pre-fills inputs when a company is provided', async () => {
    const { Harness, open } = makeHarness({
      modelValue: false,
      company: makeCompany({
        id: 5,
        name: 'Acme',
        industry: 'Software',
        website: 'https://acme.example.com',
        phone: '555-0200',
        city: 'Austin',
        state: 'TX',
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Company'))).toBe(true)
    })
    const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    expect(inputs.find((i) => i.value === 'Acme')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'Software')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'https://acme.example.com')).toBeTruthy()
    expect(inputs.find((i) => i.value === '555-0200')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'Austin')).toBeTruthy()
    expect(inputs.find((i) => i.value === 'TX')).toBeTruthy()
  })

  it('does not submit when the name field is empty', async () => {
    let postCount = 0
    server.use(
      http.post(`${API}/companies`, () => {
        postCount++
        return HttpResponse.json(makeCompany(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
    })
    // Click Create without filling the name - guard inside onSubmit should bail.
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(postCount).toBe(0)
    expect(saved).not.toHaveBeenCalled()
  })

  it('emits saved and closes the dialog after creating a new company', async () => {
    let postBody: any = null
    server.use(
      http.post(`${API}/companies`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeCompany(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
    })
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    // Fill every text field. Each fireEvent.update calls the v-model template setter.
    await fireEvent.update(inputFor('Company Name'), 'Acme')
    await fireEvent.update(inputFor('Industry'), 'Software')
    await fireEvent.update(inputFor('Website'), 'https://acme.example.com')
    await fireEvent.update(inputFor('Phone'), '555-0200')
    await fireEvent.update(inputFor('Address'), '1 Main St')
    await fireEvent.update(inputFor('City'), 'Austin')
    await fireEvent.update(inputFor('State'), 'TX')
    await fireEvent.update(inputFor('ZIP'), '78701')
    await fireEvent.update(inputFor('Notes'), 'Top customer')
    const createBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create',
    ) as HTMLButtonElement
    await fireEvent.click(createBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(postBody).toMatchObject({
      name: 'Acme',
      industry: 'Software',
      website: 'https://acme.example.com',
      phone: '555-0200',
      address: '1 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      notes: 'Top customer',
    })
  })

  it('sends a PUT to /companies/:id and emits saved when editing a company', async () => {
    let putBody: any = null
    server.use(
      http.put(`${API}/companies/55`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeCompany({ id: 55 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      company: makeCompany({ id: 55, name: 'Old Name' }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Old Name')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(putBody).toMatchObject({ name: 'Old Name' })
  })

  it('updates a company whose optional fields are empty and sends undefined values', async () => {
    let putBody: any = null
    server.use(
      http.put(`${API}/companies/77`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeCompany({ id: 77 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      company: makeCompany({
        id: 77,
        name: 'Empty',
        industry: null,
        website: null,
        phone: null,
        city: null,
        state: null,
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
    expect(putBody).toMatchObject({ name: 'Empty' })
    expect(putBody.industry).toBeUndefined()
    expect(putBody.website).toBeUndefined()
    expect(putBody.phone).toBeUndefined()
    expect(putBody.address).toBeUndefined()
    expect(putBody.city).toBeUndefined()
    expect(putBody.state).toBeUndefined()
    expect(putBody.zip).toBeUndefined()
    expect(putBody.notes).toBeUndefined()
  })

  it('closes the dialog without emitting saved when Cancel is clicked', async () => {
    const { Harness, open, saved } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
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
    const { Harness, open } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Company'))).toBe(true)
    })
    // Vuetify's v-dialog closes when Escape is pressed - it forwards through
    // its @update:model-value handler that CompanyFormDialog wires up.
    const overlay = document.body.querySelector('.v-overlay') as HTMLElement
    expect(overlay).not.toBeNull()
    await fireEvent.keyDown(overlay, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(open.value).toBe(false)
    })
  })

  it('reopens the dialog and resets fields back to the new company values', async () => {
    const { Harness, open, company } = makeHarness({ modelValue: false, company: null })
    renderWithPlugins(Harness)
    open.value = true
    company.value = makeCompany({ id: 12, name: 'Initial' })
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Initial')).toBeTruthy()
    })
    // Close, then reopen with a different company - the watch should fire
    // again on the false→true transition and reset the fields.
    open.value = false
    await waitFor(() => {
      const overlay = document.body.querySelector('.v-overlay__content') as HTMLElement
      expect(overlay?.style.display).toBe('none')
    })
    company.value = makeCompany({ id: 13, name: 'Second' })
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Second')).toBeTruthy()
    })
  })

  it('accepts a CompanyDetail object with no city or state set', async () => {
    const { Harness, open } = makeHarness({
      modelValue: false,
      company: makeCompanyDetail({ id: 99, name: 'NoLoc', city: undefined as never, state: undefined as never }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'NoLoc')).toBeTruthy()
    })
  })
})
