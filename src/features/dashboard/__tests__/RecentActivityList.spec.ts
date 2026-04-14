import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { VApp } from 'vuetify/components'
import { renderWithPlugins } from '@/test/render'
import RecentActivityList from '../RecentActivityList.vue'
import type { RecentActivity } from '@/core/models/dashboard'

function renderList(activities: RecentActivity[]) {
  const Wrapper = defineComponent({
    setup: () => () => h(VApp, null, { default: () => h(RecentActivityList, { activities }) }),
  })
  return renderWithPlugins(Wrapper)
}

describe('RecentActivityList', () => {
  it('renders the title and activity items', async () => {
    const activities: RecentActivity[] = [
      { id: 1, type: 'Call', subject: 'Follow-up call', contactName: 'Grace Hopper', userName: 'Ada', occurredAt: '2026-04-01T00:00:00.000Z' },
      { id: 2, type: 'Email', subject: 'Proposal sent', contactName: 'Alan Turing', userName: 'Bob', occurredAt: '2026-04-02T00:00:00.000Z' },
    ]
    const { findByText } = renderList(activities)
    expect(await findByText('Recent Activity')).toBeInTheDocument()
    expect(await findByText('Follow-up call')).toBeInTheDocument()
    expect(await findByText('Proposal sent')).toBeInTheDocument()
    expect(await findByText(/Grace Hopper/)).toBeInTheDocument()
  })

  it('shows the empty state when no activities are provided', async () => {
    const { findByText } = renderList([])
    expect(await findByText('No recent activity')).toBeInTheDocument()
  })

  it('renders activity without a contact name (no middot)', async () => {
    const activities: RecentActivity[] = [
      { id: 3, type: 'Note', subject: 'Internal note', contactName: null, userName: 'Charlie', occurredAt: '2026-04-01T00:00:00.000Z' },
    ]
    const { findByText, container } = renderList(activities)
    expect(await findByText('Internal note')).toBeInTheDocument()
    expect(await findByText('Charlie')).toBeInTheDocument()
    // The middot should not appear.
    const meta = container.querySelector('.activity-list__meta')
    expect(meta?.textContent).not.toContain('·')
  })

  it('renders the activity icon for each type', async () => {
    const activities: RecentActivity[] = [
      { id: 4, type: 'Meeting', subject: 'Team sync', contactName: null, userName: 'Dan', occurredAt: '2026-04-01T00:00:00.000Z' },
    ]
    const { findByText, container } = renderList(activities)
    await findByText('Team sync')
    const icon = container.querySelector('.mdi-account-group')
    expect(icon).not.toBeNull()
  })
})
