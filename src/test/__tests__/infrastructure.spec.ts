import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { server } from '../msw/server'
import { handlers } from '../msw/handlers'
import {
  makeContact,
  makeDashboardData,
  makeDeal,
  makePaginated,
  makePaginationMeta,
  makePipeline,
  makeUser,
} from '../fixtures'
import { renderWithPlugins } from '../render'

const SmokeComponent = {
  template: '<div data-testid="smoke">hello</div>',
}

describe('test infrastructure', () => {
  it('exposes a configured MSW server and handler list', () => {
    expect(server).toBeDefined()
    expect(handlers.length).toBeGreaterThan(0)
  })

  it('fixture factories build fully-typed defaults and accept overrides', () => {
    expect(makeUser()).toMatchObject({ role: 'User' })
    expect(makeUser({ role: 'Admin' }).role).toBe('Admin')
    expect(makeContact().firstName).toBe('Grace')
    expect(makeDeal({ stage: 'Won' }).stage).toBe('Won')
    expect(makeDashboardData().totalContacts).toBe(42)
    expect(makePipeline().stages).toHaveLength(6)
    expect(makePaginationMeta({ total: 5 }).total).toBe(5)

    const paginated = makePaginated([makeContact(), makeContact({ id: 2 })])
    expect(paginated.data).toHaveLength(2)
    expect(paginated.meta.total).toBe(2)
  })

  it('renders a component with Pinia, Vuetify, and Vue Router installed', () => {
    const { getByTestId, pinia, router } = renderWithPlugins(SmokeComponent)
    expect(getByTestId('smoke')).toHaveTextContent('hello')
    expect(pinia).toBeDefined()
    expect(router).toBeDefined()
  })

  it('activates a fresh Pinia so stores can be instantiated in tests', () => {
    setActivePinia(createPinia())
    expect(true).toBe(true)
  })
})
