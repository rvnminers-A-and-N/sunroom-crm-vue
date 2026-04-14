import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { VApp } from 'vuetify/components'
import { renderWithPlugins } from '@/test/render'
import type { DealStageCount } from '@/core/models/dashboard'

let capturedOptions: any = null

vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'BarStub',
    props: { data: { type: Object, default: () => ({}) }, options: { type: Object, default: () => ({}) } },
    setup(props) {
      capturedOptions = props.options
      return () =>
        h('div', { 'data-testid': 'bar-chart', 'data-labels': JSON.stringify(props.data?.labels ?? []) },
          JSON.stringify(props.data?.datasets?.[0]?.data ?? []),
        )
    },
  }),
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
}))

// Import after mocks
import PipelineChart from '../PipelineChart.vue'

function renderChart(stages: DealStageCount[]) {
  const Wrapper = defineComponent({
    setup: () => () => h(VApp, null, { default: () => h(PipelineChart, { stages }) }),
  })
  return renderWithPlugins(Wrapper)
}

describe('PipelineChart', () => {
  it('renders the title and chart with stage data', async () => {
    const stages: DealStageCount[] = [
      { stage: 'Lead', count: 2, totalValue: 5000 },
      { stage: 'Won', count: 3, totalValue: 30000 },
    ]
    const { findByText, findByTestId } = renderChart(stages)
    expect(await findByText('Pipeline by Stage')).toBeInTheDocument()
    const chart = await findByTestId('bar-chart')
    expect(chart.getAttribute('data-labels')).toContain('Lead')
    expect(chart.getAttribute('data-labels')).toContain('Won')
    expect(chart.textContent).toContain('5000')
    expect(chart.textContent).toContain('30000')
  })

  it('uses fallback color for unknown stages', async () => {
    const stages: DealStageCount[] = [
      { stage: 'CustomStage', count: 1, totalValue: 1000 },
    ]
    const { findByTestId } = renderChart(stages)
    const chart = await findByTestId('bar-chart')
    expect(chart.getAttribute('data-labels')).toContain('CustomStage')
  })

  it('renders an empty chart when no stages are provided', async () => {
    const { findByText } = renderChart([])
    expect(await findByText('Pipeline by Stage')).toBeInTheDocument()
  })

  it('formats the tooltip label callback correctly', async () => {
    renderChart([{ stage: 'Lead', count: 1, totalValue: 5000 }])
    const labelCb = capturedOptions?.plugins?.tooltip?.callbacks?.label
    expect(labelCb).toBeDefined()
    expect(labelCb({ parsed: { y: 5000 } })).toBe('$5K')
    expect(labelCb({ parsed: { y: null } })).toBe('$0K')
  })

  it('formats the y-axis tick callback correctly', async () => {
    renderChart([{ stage: 'Lead', count: 1, totalValue: 5000 }])
    const tickCb = capturedOptions?.scales?.y?.ticks?.callback
    expect(tickCb).toBeDefined()
    expect(tickCb(25000)).toBe('$25K')
  })
})
