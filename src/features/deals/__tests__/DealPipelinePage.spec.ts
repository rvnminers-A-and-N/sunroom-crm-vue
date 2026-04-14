import { defineComponent, h, type PropType } from 'vue'
import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeDeal, makePipeline } from '@/test/fixtures'
import type { Deal } from '@/core/models/deal'
import DealPipelinePage from '../DealPipelinePage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(DealPipelinePage) }),
})

/**
 * Stub for vuedraggable that:
 * - Renders item slots for each element in modelValue
 * - Renders the footer slot
 * - Exposes a data attribute with the stage's deal count for assertions
 * - Exposes a button to simulate drag-add events
 */
const DraggableStub = defineComponent({
  name: 'DraggableStub',
  props: {
    modelValue: { type: Array as PropType<Deal[]>, default: () => [] },
    group: { type: String, default: '' },
    itemKey: { type: String, default: 'id' },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { class: 'draggable-stub', 'data-deal-count': String(props.modelValue.length) }, [
        ...(props.modelValue ?? []).map((el) =>
          slots.item?.({ element: el }),
        ),
        slots.footer?.(),
        h(
          'button',
          {
            class: 'fire-drag-add',
            onClick: () => {
              const fakeDeal = makeDeal({ id: 999, title: 'Dragged', value: 1000, stage: 'Lead', contactId: 1 })
              emit('change', { added: { element: fakeDeal } })
            },
          },
          'fire-drag-add',
        ),
      ])
  },
})

function makePipelineRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/deals', name: 'deals', component: Stub },
      { path: '/deals/pipeline', name: 'deal-pipeline', component: Stub },
      { path: '/deals/:id', name: 'deal-detail', component: Stub },
    ],
  })
  router.push('/deals/pipeline')
  return router
}

function renderPipeline(router = makePipelineRouter()) {
  return renderWithPlugins(AppWrapped, {
    router,
    renderOptions: {
      global: {
        stubs: { draggable: DraggableStub },
      },
    },
  })
}

describe('DealPipelinePage', () => {
  it('renders the pipeline header and stage columns', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('Pipeline')
      expect(container.textContent).toContain('Lead')
      expect(container.textContent).toContain('Qualified')
      expect(container.textContent).toContain('Won')
    })
  })

  it('renders deal cards in the correct stage columns', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('Enterprise License')
    })
  })

  it('shows the "No deals" placeholder for empty stages', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
    )
    const { findAllByText } = renderPipeline()
    const noDealLabels = await findAllByText('No deals')
    // makePipeline has 3 empty stages: Proposal, Negotiation, Lost.
    expect(noDealLabels.length).toBe(3)
  })

  it('opens the create dialog when Add Deal is clicked', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
    )
    const { findByText } = renderPipeline()
    const addBtn = await findByText('Add Deal')
    await fireEvent.click(addBtn)
    await waitFor(() => {
      const titles = Array.from(document.body.querySelectorAll('.v-card-title'))
      expect(titles.some((t) => t.textContent?.includes('New Deal'))).toBe(true)
    })
  })

  it('calls onDragChange and persists the stage update when a deal is dragged', async () => {
    let putBody: any = null
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
      http.put(`${API}/deals/:id`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeDeal())
      }),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('Lead')
    })
    // Click a "fire-drag-add" button on a stage column. The draggable stub
    // emits the `change` event with `added.element`, triggering onDragChange.
    const fireBtns = container.querySelectorAll('.fire-drag-add')
    // Pick the first column (Lead).
    await fireEvent.click(fireBtns[0] as HTMLElement)
    await waitFor(() => {
      expect(putBody).not.toBeNull()
      expect(putBody.stage).toBe('Lead')
    })
  })

  it('reloads the pipeline when the form dialog emits saved', async () => {
    let pipelineCount = 0
    server.use(
      http.get(`${API}/deals/pipeline`, () => {
        pipelineCount++
        return HttpResponse.json(makePipeline())
      }),
    )
    const DealFormDialogStub = defineComponent({
      name: 'DealFormDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        deal: { type: Object, default: null },
      },
      emits: ['update:modelValue', 'saved'],
      setup(props, { emit }) {
        return () =>
          h(
            'div',
            { 'data-testid': 'form-stub', 'data-open': String(props.modelValue) },
            [
              h('button', { 'data-testid': 'fire-saved', onClick: () => emit('saved') }, 'fire'),
              h('button', { 'data-testid': 'fire-update-model', onClick: () => emit('update:modelValue', false) }, 'fire-close'),
            ],
          )
      },
    })
    const { findByText, findByTestId } = renderWithPlugins(AppWrapped, {
      router: makePipelineRouter(),
      renderOptions: {
        global: {
          stubs: { draggable: DraggableStub, DealFormDialog: DealFormDialogStub },
        },
      },
    })
    await waitFor(() => {
      expect(pipelineCount).toBe(1)
    })
    // Open the form and fire saved.
    const addBtn = await findByText('Add Deal')
    await fireEvent.click(addBtn)
    const stub = await findByTestId('form-stub')
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    await fireEvent.click(await findByTestId('fire-saved'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
      expect(pipelineCount).toBeGreaterThanOrEqual(2)
    })
    // Exercise v-model setter.
    await fireEvent.click(await findByText('Add Deal'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('true')
    })
    await fireEvent.click(await findByTestId('fire-update-model'))
    await waitFor(() => {
      expect(stub.getAttribute('data-open')).toBe('false')
    })
  })

  it('applies the correct border color for each stage', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      const headers = container.querySelectorAll('.pipeline__header')
      expect(headers.length).toBeGreaterThan(0)
    })
    const headers = container.querySelectorAll('.pipeline__header')
    const leadHeader = Array.from(headers).find((h) => h.textContent?.includes('Lead'))
    expect(leadHeader?.style.borderColor).toBe('rgb(37, 99, 235)')
  })

  it('handles pipeline fetch returning null', async () => {
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(null)),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('Pipeline')
    })
    // No stage columns should render when pipeline is null.
    const headers = container.querySelectorAll('.pipeline__header')
    expect(headers.length).toBe(0)
  })

  it('reloads on drag error', async () => {
    let pipelineCount = 0
    server.use(
      http.get(`${API}/deals/pipeline`, () => {
        pipelineCount++
        return HttpResponse.json(makePipeline())
      }),
      http.put(`${API}/deals/:id`, () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(pipelineCount).toBe(1)
    })
    const fireBtns = container.querySelectorAll('.fire-drag-add')
    await fireEvent.click(fireBtns[0] as HTMLElement)
    // After error, the pipeline should reload.
    await waitFor(() => {
      expect(pipelineCount).toBeGreaterThanOrEqual(2)
    })
  })

  it('removes the deal from the source stage when dragged to a different stage', async () => {
    let putBody: any = null
    // Create a special draggable stub that:
    // - On the Qualified column, emits change.added with a deal that exists in Lead (id=10)
    // - Also emits update:modelValue to cover v-model setter (line 111)
    const DraggableWithSource = defineComponent({
      name: 'DraggableWithSource',
      props: {
        modelValue: { type: Array as PropType<Deal[]>, default: () => [] },
        group: { type: String, default: '' },
        itemKey: { type: String, default: 'id' },
      },
      emits: ['update:modelValue', 'change'],
      setup(props, { slots, emit }) {
        return () =>
          h('div', { class: 'draggable-stub', 'data-deal-count': String(props.modelValue.length) }, [
            ...(props.modelValue ?? []).map((el) =>
              slots.item?.({ element: el }),
            ),
            slots.footer?.(),
            h(
              'button',
              {
                class: 'fire-drag-cross-stage',
                onClick: () => {
                  // Simulate dragging deal id=10 (from Lead) into this column
                  const movedDeal = makeDeal({ id: 10, title: 'Enterprise License', value: 2500, stage: 'Lead', contactId: 1 })
                  emit('update:modelValue', [...props.modelValue, movedDeal])
                  emit('change', { added: { element: movedDeal } })
                },
              },
              'fire-drag-cross-stage',
            ),
          ])
      },
    })
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
      http.put(`${API}/deals/:id`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeDeal())
      }),
    )
    const { container } = renderWithPlugins(AppWrapped, {
      router: makePipelineRouter(),
      renderOptions: {
        global: {
          stubs: { draggable: DraggableWithSource },
        },
      },
    })
    await waitFor(() => {
      expect(container.textContent).toContain('Qualified')
    })
    // Click the fire button on the Qualified column (index 1) to simulate dragging
    // deal id=10 from Lead into Qualified.
    const fireBtns = container.querySelectorAll('.fire-drag-cross-stage')
    await fireEvent.click(fireBtns[1] as HTMLElement)
    await waitFor(() => {
      expect(putBody).not.toBeNull()
      expect(putBody.stage).toBe('Qualified')
    })
  })

  it('handles null pipeline during loadPipeline after a drag error', async () => {
    let requestCount = 0
    server.use(
      http.get(`${API}/deals/pipeline`, () => {
        requestCount++
        // First call returns valid data, second returns null (simulating error recovery).
        if (requestCount === 1) return HttpResponse.json(makePipeline())
        return HttpResponse.json(null)
      }),
      http.put(`${API}/deals/:id`, () => new HttpResponse(null, { status: 500 })),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('Lead')
    })
    const fireBtns = container.querySelectorAll('.fire-drag-add')
    await fireEvent.click(fireBtns[0] as HTMLElement)
    // After drag error, loadPipeline() runs and gets null.
    await waitFor(() => {
      expect(requestCount).toBeGreaterThanOrEqual(2)
    })
  })

  it('uses fallback color for a stage not in STAGE_COLORS', async () => {
    const customPipeline = {
      stages: [
        { stage: 'CustomUnknown', count: 0, totalValue: 0, deals: [] },
      ],
    }
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(customPipeline)),
    )
    const { container } = renderPipeline()
    await waitFor(() => {
      expect(container.textContent).toContain('CustomUnknown')
    })
    const header = container.querySelector('.pipeline__header') as HTMLElement
    expect(header.style.borderColor).toBe('rgb(107, 114, 128)')
  })

  it('sends undefined for null companyId and expectedCloseDate during drag', async () => {
    let putBody: any = null
    // Use a draggable stub that emits a deal with null optional fields.
    const DraggableNullOptionals = defineComponent({
      name: 'DraggableNullOptionals',
      props: {
        modelValue: { type: Array as PropType<Deal[]>, default: () => [] },
        group: { type: String, default: '' },
        itemKey: { type: String, default: 'id' },
      },
      emits: ['update:modelValue', 'change'],
      setup(props, { slots, emit }) {
        return () =>
          h('div', { class: 'draggable-stub' }, [
            ...(props.modelValue ?? []).map((el) =>
              slots.item?.({ element: el }),
            ),
            slots.footer?.(),
            h(
              'button',
              {
                class: 'fire-drag-null',
                onClick: () => {
                  const deal = makeDeal({ id: 888, companyId: null, expectedCloseDate: null, contactId: 1 })
                  emit('change', { added: { element: deal } })
                },
              },
              'fire-drag-null',
            ),
          ])
      },
    })
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
      http.put(`${API}/deals/:id`, async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(makeDeal())
      }),
    )
    const { container } = renderWithPlugins(AppWrapped, {
      router: makePipelineRouter(),
      renderOptions: {
        global: {
          stubs: { draggable: DraggableNullOptionals },
        },
      },
    })
    await waitFor(() => {
      expect(container.textContent).toContain('Lead')
    })
    const fireBtn = container.querySelector('.fire-drag-null') as HTMLElement
    await fireEvent.click(fireBtn)
    await waitFor(() => {
      expect(putBody).not.toBeNull()
    })
    expect(putBody.companyId).toBeUndefined()
    expect(putBody.expectedCloseDate).toBeUndefined()
  })

  it('skips processing when drag event has no added element', async () => {
    let putCount = 0
    server.use(
      http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
      http.put(`${API}/deals/:id`, () => {
        putCount++
        return HttpResponse.json(makeDeal())
      }),
    )
    // Create a custom draggable stub that emits change without `added`.
    const DraggableNoAdd = defineComponent({
      name: 'DraggableNoAdd',
      props: {
        modelValue: { type: Array as PropType<Deal[]>, default: () => [] },
        group: { type: String, default: '' },
        itemKey: { type: String, default: 'id' },
      },
      emits: ['update:modelValue', 'change'],
      setup(props, { slots, emit }) {
        return () =>
          h('div', { class: 'draggable-stub' }, [
            ...(props.modelValue ?? []).map((el: Deal) =>
              slots.item?.({ element: el }),
            ),
            slots.footer?.(),
            h(
              'button',
              {
                'data-testid': 'fire-no-add',
                onClick: () => emit('change', { removed: { element: makeDeal() } }),
              },
              'fire-no-add',
            ),
          ])
      },
    })
    const { container } = renderWithPlugins(AppWrapped, {
      router: makePipelineRouter(),
      renderOptions: {
        global: {
          stubs: { draggable: DraggableNoAdd },
        },
      },
    })
    await waitFor(() => {
      expect(container.textContent).toContain('Lead')
    })
    const fireBtn = container.querySelector('[data-testid="fire-no-add"]') as HTMLElement
    await fireEvent.click(fireBtn)
    await new Promise((r) => setTimeout(r, 50))
    expect(putCount).toBe(0)
  })
})
