import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeDashboardData } from '@/test/fixtures'

vi.mock('vue-chartjs', () => ({
  Bar: defineComponent({
    name: 'BarStub',
    props: { data: { type: Object, default: () => ({}) }, options: { type: Object, default: () => ({}) } },
    setup(props) {
      return () => h('div', { 'data-testid': 'bar-chart-stub' }, JSON.stringify(props.data?.labels ?? []))
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

import DashboardPage from '../DashboardPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

const AppWrapped = defineComponent({
  render: () => h(VApp, null, { default: () => h(DashboardPage) }),
})

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: Stub },
      { path: '/contacts', name: 'contacts', component: Stub },
      { path: '/companies', name: 'companies', component: Stub },
      { path: '/deals', name: 'deals', component: Stub },
    ],
  })
  router.push('/')
  return router
}

function renderDashboard(router = makeRouter()) {
  return renderWithPlugins(AppWrapped, { router })
}

describe('DashboardPage', () => {
  it('shows a loading indicator before the data loads', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((r) => (resolve = r))
    server.use(
      http.get(`${API}/dashboard`, async () => {
        await pending
        return HttpResponse.json(makeDashboardData())
      }),
    )
    const { findByText } = renderDashboard()
    expect(await findByText('Loading dashboard...')).toBeInTheDocument()
    resolve()
  })

  it('renders the dashboard title and stat cards when data loads', async () => {
    server.use(
      http.get(`${API}/dashboard`, () => HttpResponse.json(makeDashboardData())),
    )
    const { findByText } = renderDashboard()
    expect(await findByText('Dashboard')).toBeInTheDocument()
    expect(await findByText('Total Contacts')).toBeInTheDocument()
    expect(await findByText('42')).toBeInTheDocument()
    expect(await findByText('Total Companies')).toBeInTheDocument()
    expect(await findByText('12')).toBeInTheDocument()
    expect(await findByText('Active Deals')).toBeInTheDocument()
    expect(await findByText('8')).toBeInTheDocument()
    expect(await findByText('Pipeline Value')).toBeInTheDocument()
    expect(await findByText('Won Revenue')).toBeInTheDocument()
  })

  it('renders the PipelineChart and RecentActivityList sections', async () => {
    server.use(
      http.get(`${API}/dashboard`, () => HttpResponse.json(makeDashboardData())),
    )
    const { findByText, findByTestId } = renderDashboard()
    expect(await findByText('Pipeline by Stage')).toBeInTheDocument()
    expect(await findByText('Recent Activity')).toBeInTheDocument()
    const chart = await findByTestId('bar-chart-stub')
    expect(chart.textContent).toContain('Lead')
  })

  it('renders recent activities with contact names', async () => {
    server.use(
      http.get(`${API}/dashboard`, () => HttpResponse.json(makeDashboardData())),
    )
    const { findByText } = renderDashboard()
    expect(await findByText('Follow-up call')).toBeInTheDocument()
    expect(await findByText(/Grace Hopper/)).toBeInTheDocument()
  })

  it('shows "No recent activity" when the activities list is empty', async () => {
    server.use(
      http.get(`${API}/dashboard`, () =>
        HttpResponse.json(makeDashboardData({ recentActivities: [] })),
      ),
    )
    const { findByText } = renderDashboard()
    expect(await findByText('No recent activity')).toBeInTheDocument()
  })

  it('renders activities without a contact name', async () => {
    server.use(
      http.get(`${API}/dashboard`, () =>
        HttpResponse.json(
          makeDashboardData({
            recentActivities: [
              { id: 2, type: 'Note', subject: 'Solo note', contactName: null, userName: 'Alice', occurredAt: '2026-04-01T00:00:00.000Z' },
            ],
          }),
        ),
      ),
    )
    const { findByText, queryByText } = renderDashboard()
    expect(await findByText('Solo note')).toBeInTheDocument()
    expect(queryByText('·')).toBeNull()
  })

  it('renders stat card links to contacts, companies, and deals', async () => {
    server.use(
      http.get(`${API}/dashboard`, () => HttpResponse.json(makeDashboardData())),
    )
    const { container, findByText } = renderDashboard()
    await findByText('Total Contacts')
    const links = container.querySelectorAll('a')
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/contacts')
    expect(hrefs).toContain('/companies')
    expect(hrefs).toContain('/deals')
  })
})
