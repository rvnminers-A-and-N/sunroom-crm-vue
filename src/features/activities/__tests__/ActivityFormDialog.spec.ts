import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeActivity, makeContact, makeDeal } from '@/test/fixtures'
import ActivityFormDialog from '../ActivityFormDialog.vue'

const API = 'http://localhost:5236/api'

function setupFormHandlers() {
  server.use(
    http.get(`${API}/contacts`, () =>
      HttpResponse.json({
        data: [makeContact({ id: 1, firstName: 'Grace', lastName: 'Hopper' })],
        meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
      }),
    ),
    http.get(`${API}/deals`, () =>
      HttpResponse.json({
        data: [makeDeal({ id: 1, title: 'Enterprise License' })],
        meta: { currentPage: 1, perPage: 200, total: 1, lastPage: 1 },
      }),
    ),
  )
}

function makeHarness(initial: { modelValue: boolean; activity: any }) {
  const open = ref(initial.modelValue)
  const activity = ref(initial.activity)
  const saved = vi.fn()
  const Harness = defineComponent({
    setup() {
      return () =>
        h(VApp, null, {
          default: () =>
            h(ActivityFormDialog, {
              modelValue: open.value,
              activity: activity.value,
              'onUpdate:modelValue': (v: boolean) => (open.value = v),
              onSaved: saved,
            }),
        })
    },
  })
  return { Harness, open, activity, saved }
}

describe('ActivityFormDialog', () => {
  it('does not render form fields when modelValue is false', () => {
    setupFormHandlers()
    const { Harness } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    expect(document.body.querySelector('.v-card-title')).toBeNull()
  })

  it('renders the "Log Activity" title when no activity is provided', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
  })

  it('renders the "Edit Activity" title and pre-fills inputs when an activity is provided', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({
      modelValue: false,
      activity: makeActivity({
        id: 5,
        type: 'Call',
        subject: 'Follow-up',
        body: 'Great call.',
        contactId: 1,
        dealId: 1,
        occurredAt: '2026-06-01T00:00:00.000Z',
      }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Edit Activity'))).toBe(true)
    })
    const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
    expect(inputs.find((i) => i.value === 'Follow-up')).toBeTruthy()
    expect(inputs.find((i) => i.value === '2026-06-01')).toBeTruthy()
    const textareas = Array.from(document.body.querySelectorAll<HTMLTextAreaElement>('textarea'))
    expect(textareas.find((t) => t.value === 'Great call.')).toBeTruthy()
  })

  it('does not submit when subject is empty', async () => {
    setupFormHandlers()
    let postCount = 0
    server.use(
      http.post(`${API}/activities`, () => {
        postCount++
        return HttpResponse.json(makeActivity(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
    const logBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Log',
    ) as HTMLButtonElement
    await fireEvent.click(logBtn)
    await new Promise((r) => setTimeout(r, 30))
    expect(postCount).toBe(0)
    expect(saved).not.toHaveBeenCalled()
  })

  it('creates a new activity with all fields filled', { timeout: 15000 }, async () => {
    setupFormHandlers()
    let postBody: any = null
    server.use(
      http.post(`${API}/activities`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeActivity(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    await fireEvent.update(inputFor('Subject'), 'New Activity')
    // Change type from Note to Call.
    const typeField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Type',
    ) as HTMLElement
    await fireEvent.mouseDown(typeField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Call'))).toBe(true)
    })
    const callItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Call'),
    ) as HTMLElement
    await fireEvent.click(callItem)
    // Set date.
    const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement
    await fireEvent.update(dateInput, '2026-12-31')
    // Set body text.
    await fireEvent.update(inputFor('Body'), 'Detailed notes here.')
    // Select a contact.
    const contactField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
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
    // Select a deal.
    const dealField = Array.from(document.body.querySelectorAll('.v-field')).find((f) =>
      f.querySelector('label.v-label')?.textContent?.trim() === 'Deal',
    ) as HTMLElement
    await fireEvent.mouseDown(dealField)
    await waitFor(() => {
      const items = Array.from(document.body.querySelectorAll('.v-list-item'))
      expect(items.some((i) => i.textContent?.includes('Enterprise License'))).toBe(true)
    })
    const dealItem = Array.from(document.body.querySelectorAll('.v-list-item')).find((i) =>
      i.textContent?.includes('Enterprise License'),
    ) as HTMLElement
    await fireEvent.click(dealItem)
    // Submit.
    const logBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Log',
    ) as HTMLButtonElement
    await fireEvent.click(logBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(postBody).toMatchObject({
      type: 'Call',
      subject: 'New Activity',
      body: 'Detailed notes here.',
      contactId: 1,
      dealId: 1,
    })
  })

  it('sends a PUT when editing an existing activity', async () => {
    setupFormHandlers()
    let putBody: any = null
    server.use(
      http.put(`${API}/activities/42`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeActivity({ id: 42 }))
      }),
    )
    const { Harness, open, saved } = makeHarness({
      modelValue: false,
      activity: makeActivity({ id: 42, subject: 'Old Subject', contactId: 1 }),
    })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Old Subject')).toBeTruthy()
    })
    const saveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    ) as HTMLButtonElement
    await fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
      expect(open.value).toBe(false)
    })
    expect(putBody).toMatchObject({ subject: 'Old Subject' })
  })

  it('sends undefined for empty optional fields', async () => {
    setupFormHandlers()
    let postBody: any = null
    server.use(
      http.post(`${API}/activities`, async ({ request }) => {
        postBody = await request.json()
        return HttpResponse.json(makeActivity(), { status: 201 })
      }),
    )
    const { Harness, open, saved } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    await fireEvent.update(inputFor('Subject'), 'Minimal Activity')
    // Clear the date to trigger the empty occurredAt branch.
    const dateInput = document.body.querySelector('input[type="date"]') as HTMLInputElement
    await fireEvent.update(dateInput, '')
    const logBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Log',
    ) as HTMLButtonElement
    await fireEvent.click(logBtn)
    await waitFor(() => {
      expect(saved).toHaveBeenCalled()
    })
    expect(postBody.subject).toBe('Minimal Activity')
    expect(postBody.body).toBeUndefined()
    expect(postBody.contactId).toBeUndefined()
    expect(postBody.dealId).toBeUndefined()
  })

  it('closes the dialog without emitting saved when Cancel is clicked', async () => {
    setupFormHandlers()
    const { Harness, open, saved } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
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
    const { Harness, open } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
    const overlay = document.body.querySelector('.v-overlay') as HTMLElement
    await fireEvent.keyDown(overlay, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(open.value).toBe(false)
    })
  })

  it('reopens the dialog and resets fields for a different activity', async () => {
    setupFormHandlers()
    const { Harness, open, activity } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    activity.value = makeActivity({ id: 10, subject: 'First Activity' })
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'First Activity')).toBeTruthy()
    })
    open.value = false
    await waitFor(() => {
      const overlay = document.body.querySelector('.v-overlay__content') as HTMLElement
      expect(overlay?.style.display).toBe('none')
    })
    activity.value = makeActivity({ id: 11, subject: 'Second Activity' })
    open.value = true
    await waitFor(() => {
      const inputs = Array.from(document.body.querySelectorAll<HTMLInputElement>('input'))
      expect(inputs.find((i) => i.value === 'Second Activity')).toBeTruthy()
    })
  })

  it('shows validation error when subject is empty and submit is clicked', async () => {
    setupFormHandlers()
    const { Harness, open } = makeHarness({ modelValue: false, activity: null })
    renderWithPlugins(Harness)
    open.value = true
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('Log Activity'))).toBe(true)
    })
    const labels = () => Array.from(document.body.querySelectorAll<HTMLLabelElement>('label.v-label'))
    function inputFor(labelText: string): HTMLInputElement | HTMLTextAreaElement {
      const label = labels().find((l) => l.textContent?.trim() === labelText)
      const id = label?.getAttribute('for')
      return document.body.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement
    }
    const subjectInput = inputFor('Subject')
    await fireEvent.update(subjectInput, 'temp')
    await fireEvent.update(subjectInput, '')
    await fireEvent.blur(subjectInput)
    await waitFor(() => {
      expect(document.body.textContent).toContain('Required')
    })
  })
})
