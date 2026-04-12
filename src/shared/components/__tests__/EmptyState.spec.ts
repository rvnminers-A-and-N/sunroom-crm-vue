import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithPlugins } from '@/test/render'
import EmptyState from '../EmptyState.vue'

describe('EmptyState', () => {
  it('renders the default title, message, and inbox icon when no props are passed', () => {
    const { getByText, container } = renderWithPlugins(EmptyState)
    expect(getByText('No data')).toBeInTheDocument()
    expect(getByText('Nothing to show here yet.')).toBeInTheDocument()
    expect(container.querySelector('.v-icon')?.classList.contains('mdi-inbox')).toBe(true)
  })

  it('renders custom title, message, and icon when provided', () => {
    const { getByText, container } = renderWithPlugins(EmptyState, {
      renderOptions: {
        props: {
          icon: 'mdi-account-off',
          title: 'No contacts',
          message: 'Add your first contact to get started.',
        },
      },
    })
    expect(getByText('No contacts')).toBeInTheDocument()
    expect(getByText('Add your first contact to get started.')).toBeInTheDocument()
    expect(container.querySelector('.v-icon')?.classList.contains('mdi-account-off')).toBe(true)
  })

  it('omits the action button when no actionLabel is provided', () => {
    const { queryByRole } = renderWithPlugins(EmptyState)
    expect(queryByRole('button')).toBeNull()
  })

  it('renders the action button and emits "action" when clicked', async () => {
    const user = userEvent.setup()
    const { getByRole, emitted } = renderWithPlugins(EmptyState, {
      renderOptions: { props: { actionLabel: 'Add contact' } },
    })
    await user.click(getByRole('button', { name: /Add contact/ }))
    expect(emitted()).toHaveProperty('action')
    expect(emitted().action).toHaveLength(1)
  })
})
