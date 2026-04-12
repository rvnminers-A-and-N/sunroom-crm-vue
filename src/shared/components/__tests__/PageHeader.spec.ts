import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithPlugins } from '@/test/render'
import PageHeader from '../PageHeader.vue'

describe('PageHeader', () => {
  it('renders the title heading', () => {
    const { getByRole } = renderWithPlugins(PageHeader, {
      renderOptions: { props: { title: 'Contacts' } },
    })
    expect(getByRole('heading', { level: 1, name: 'Contacts' })).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    const { getByText } = renderWithPlugins(PageHeader, {
      renderOptions: { props: { title: 'Contacts', subtitle: 'Manage your network' } },
    })
    expect(getByText('Manage your network')).toBeInTheDocument()
  })

  it('omits the subtitle paragraph when not provided', () => {
    const { container } = renderWithPlugins(PageHeader, {
      renderOptions: { props: { title: 'Contacts' } },
    })
    expect(container.querySelector('.page-header__subtitle')).toBeNull()
  })

  it('omits the action button when no actionLabel is provided', () => {
    const { queryByRole } = renderWithPlugins(PageHeader, {
      renderOptions: { props: { title: 'Contacts' } },
    })
    expect(queryByRole('button')).toBeNull()
  })

  it('renders the action button and emits "action" when clicked', async () => {
    const user = userEvent.setup()
    const { getByRole, emitted } = renderWithPlugins(PageHeader, {
      renderOptions: { props: { title: 'Contacts', actionLabel: 'New Contact' } },
    })
    const btn = getByRole('button', { name: /New Contact/ })
    await user.click(btn)
    expect(emitted()).toHaveProperty('action')
    expect(emitted().action).toHaveLength(1)
  })
})
