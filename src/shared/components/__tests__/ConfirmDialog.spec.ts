import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VDialog } from 'vuetify/components'
import { renderWithPlugins } from '@/test/render'
import ConfirmDialog from '../ConfirmDialog.vue'

const baseProps = {
  modelValue: true,
  title: 'Delete contact',
  message: 'Are you sure?',
}

describe('ConfirmDialog', () => {
  it('renders the title and message when open', () => {
    const { getByText } = renderWithPlugins(ConfirmDialog, {
      renderOptions: { props: baseProps },
    })
    expect(getByText('Delete contact')).toBeInTheDocument()
    expect(getByText('Are you sure?')).toBeInTheDocument()
  })

  it('does not render dialog content when closed', () => {
    const { queryByText } = renderWithPlugins(ConfirmDialog, {
      renderOptions: { props: { ...baseProps, modelValue: false } },
    })
    expect(queryByText('Delete contact')).toBeNull()
  })

  it('emits update:modelValue=false when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { getByRole, emitted } = renderWithPlugins(ConfirmDialog, {
      renderOptions: { props: baseProps },
    })
    await user.click(getByRole('button', { name: 'Cancel' }))
    expect(emitted()).toHaveProperty('update:modelValue')
    expect(emitted()['update:modelValue']).toEqual([[false]])
  })

  it('emits both confirm and update:modelValue=false when Delete is clicked', async () => {
    const user = userEvent.setup()
    const { getByRole, emitted } = renderWithPlugins(ConfirmDialog, {
      renderOptions: { props: baseProps },
    })
    await user.click(getByRole('button', { name: 'Delete' }))
    expect(emitted()).toHaveProperty('confirm')
    expect(emitted().confirm).toHaveLength(1)
    expect(emitted()['update:modelValue']).toEqual([[false]])
  })

  it('forwards update:modelValue when the v-dialog dismisses itself', async () => {
    // The inline @update:model-value handler on v-dialog (line 23) is only
    // triggered when the dialog itself emits — e.g. escape, outside click.
    // We mount the wrapper with @vue/test-utils so we can find VDialog and
    // emit update:modelValue from it directly.
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConfirmDialog, {
      props: baseProps,
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    const dialog = wrapper.findComponent(VDialog)
    expect(dialog.exists()).toBe(true)
    await dialog.vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })
})
