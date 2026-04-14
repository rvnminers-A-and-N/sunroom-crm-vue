import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { VApp } from 'vuetify/components'
import { renderWithPlugins } from '@/test/render'
import { makeDeal } from '@/test/fixtures'
import DealCard from '../DealCard.vue'

const Stub = { template: '<div>stub</div>' }

function renderCard(dealOverrides: Partial<Parameters<typeof makeDeal>[0]> = {}) {
  const deal = makeDeal(dealOverrides)
  const Wrapper = defineComponent({
    setup: () => () => h(VApp, null, { default: () => h(DealCard, { deal }) }),
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/deals/:id', name: 'deal-detail', component: Stub }],
  })
  router.push('/')
  return renderWithPlugins(Wrapper, { router })
}

describe('DealCard', () => {
  it('renders the deal title, value, and contact name', async () => {
    const { findByText } = renderCard({ title: 'Big Deal', value: 50000, contactName: 'Grace Hopper' })
    expect(await findByText('Big Deal')).toBeInTheDocument()
    expect(await findByText('$50,000')).toBeInTheDocument()
    expect(await findByText('Grace Hopper')).toBeInTheDocument()
  })

  it('renders the company name when present', async () => {
    const { findByText } = renderCard({ companyName: 'Acme Inc' })
    expect(await findByText('Acme Inc')).toBeInTheDocument()
  })

  it('hides the company name when absent', () => {
    const { queryByText } = renderCard({ companyName: null })
    expect(queryByText('Acme Inc')).toBeNull()
  })

  it('renders the expected close date when present', async () => {
    const { container, findByText } = renderCard({ expectedCloseDate: '2026-06-01T00:00:00.000Z' })
    await findByText('Enterprise License')
    // The formatDate utility formats it - just check a date icon is present.
    const dateIcon = container.querySelector('.mdi-calendar')
    expect(dateIcon).not.toBeNull()
  })

  it('hides the expected close date when absent', () => {
    const { container } = renderCard({ expectedCloseDate: null })
    const dateItems = container.querySelectorAll('.deal-card__date')
    expect(dateItems.length).toBe(0)
  })
})
