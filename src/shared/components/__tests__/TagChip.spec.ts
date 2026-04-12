import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithPlugins } from '@/test/render'
import TagChip from '../TagChip.vue'
import { makeTag } from '@/test/fixtures'

describe('TagChip', () => {
  it('renders the tag name with the tag color applied to the chip background and text', () => {
    const tag = makeTag({ id: 1, name: 'VIP', color: '#ff0000' })
    const { getByText, container } = renderWithPlugins(TagChip, {
      renderOptions: { props: { tag } },
    })
    expect(getByText('VIP')).toBeInTheDocument()
    const chip = container.querySelector('.v-chip') as HTMLElement
    // tag.color is appended with '20' for alpha, so jsdom outputs rgba(255, 0, 0, 0.125).
    expect(chip.getAttribute('style')).toContain('rgba(255, 0, 0, 0.125)')
    expect(chip.getAttribute('style')).toContain('rgb(255, 0, 0)')
  })

  it('omits the remove icon when removable is false', () => {
    const { container } = renderWithPlugins(TagChip, {
      renderOptions: { props: { tag: makeTag(), removable: false } },
    })
    expect(container.querySelector('.v-icon')).toBeNull()
  })

  it('omits the remove icon when removable is not provided', () => {
    const { container } = renderWithPlugins(TagChip, {
      renderOptions: { props: { tag: makeTag() } },
    })
    expect(container.querySelector('.v-icon')).toBeNull()
  })

  it('renders the remove icon and emits "remove" when clicked', async () => {
    const user = userEvent.setup()
    const { container, emitted } = renderWithPlugins(TagChip, {
      renderOptions: { props: { tag: makeTag(), removable: true } },
    })
    const removeIcon = container.querySelector('.v-icon')
    expect(removeIcon).not.toBeNull()
    await user.click(removeIcon as Element)
    expect(emitted()).toHaveProperty('remove')
    expect(emitted().remove).toHaveLength(1)
  })
})
