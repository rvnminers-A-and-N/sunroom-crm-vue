import { describe, expect, it } from 'vitest'
import { renderWithPlugins } from '@/test/render'
import { hexToRgb } from '@/test/css'
import StatCard from '../StatCard.vue'

describe('StatCard', () => {
  it('renders the label, value, and icon glyph', () => {
    const { getByText, container } = renderWithPlugins(StatCard, {
      renderOptions: {
        props: { icon: 'mdi-account', label: 'Contacts', value: 42 },
      },
    })
    expect(getByText('Contacts')).toBeInTheDocument()
    expect(getByText('42')).toBeInTheDocument()
    expect(container.querySelector('.v-icon')?.classList.contains('mdi-account')).toBe(true)
  })

  it('renders string values verbatim', () => {
    const { getByText } = renderWithPlugins(StatCard, {
      renderOptions: {
        props: { icon: 'mdi-cash', label: 'Revenue', value: '$1.2M' },
      },
    })
    expect(getByText('$1.2M')).toBeInTheDocument()
  })

  it('uses the default icon background and color when none are provided', () => {
    const { container } = renderWithPlugins(StatCard, {
      renderOptions: {
        props: { icon: 'mdi-account', label: 'Contacts', value: 1 },
      },
    })
    const iconWrap = container.querySelector('.stat-card__icon') as HTMLElement
    // Default background is `rgba(2, 121, 95, 0.1)` and jsdom keeps rgba as-is.
    expect(iconWrap.getAttribute('style')).toContain('rgba(2, 121, 95, 0.1)')
    const iconEl = container.querySelector('.v-icon') as HTMLElement
    // Default color is the CSS variable, which jsdom passes through unchanged.
    expect(iconEl.getAttribute('style')).toContain('var(--sr-primary)')
  })

  it('honors custom iconBg and iconColor props', () => {
    const { container } = renderWithPlugins(StatCard, {
      renderOptions: {
        props: {
          icon: 'mdi-cash',
          label: 'Revenue',
          value: 1,
          iconBg: 'rgb(255, 0, 0)',
          iconColor: '#abcdef',
        },
      },
    })
    const iconWrap = container.querySelector('.stat-card__icon') as HTMLElement
    expect(iconWrap.getAttribute('style')).toContain('rgb(255, 0, 0)')
    const iconEl = container.querySelector('.v-icon') as HTMLElement
    expect(iconEl.getAttribute('style')).toContain(hexToRgb('#abcdef'))
  })
})
