import { describe, expect, it } from 'vitest'
import { renderWithPlugins } from '@/test/render'
import { hexToRgb } from '@/test/css'
import ActivityIcon from '../ActivityIcon.vue'

const KNOWN_TYPES: Array<{ type: string; icon: string; color: string }> = [
  { type: 'Note', icon: 'mdi-text', color: '#6b7280' },
  { type: 'Call', icon: 'mdi-phone', color: '#3b82f6' },
  { type: 'Email', icon: 'mdi-email', color: '#f9a66c' },
  { type: 'Meeting', icon: 'mdi-account-group', color: '#02795f' },
  { type: 'Task', icon: 'mdi-check-circle', color: '#f76c6c' },
]

describe('ActivityIcon', () => {
  for (const { type, icon, color } of KNOWN_TYPES) {
    it(`renders the ${icon} glyph in ${color} for the ${type} activity type`, () => {
      const { container } = renderWithPlugins(ActivityIcon, { renderOptions: { props: { type } } })
      const iconEl = container.querySelector('.v-icon') as HTMLElement
      expect(iconEl).not.toBeNull()
      expect(iconEl.classList.contains(icon)).toBe(true)
      expect(iconEl.getAttribute('style')).toContain(hexToRgb(color))
    })
  }

  it('falls back to a generic calendar icon for unknown activity types', () => {
    const { container } = renderWithPlugins(ActivityIcon, {
      renderOptions: { props: { type: 'Unknown' } },
    })
    const iconEl = container.querySelector('.v-icon') as HTMLElement
    expect(iconEl.classList.contains('mdi-calendar')).toBe(true)
    expect(iconEl.getAttribute('style')).toContain(hexToRgb('#6b7280'))
  })
})
