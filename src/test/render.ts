import { render } from '@testing-library/vue'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { Component } from 'vue'

type RenderParams = Parameters<typeof render>
type RenderOptionsParam = NonNullable<RenderParams[1]>

export interface RenderWithPluginsOptions {
  /** Extra @testing-library/vue render options (props, slots, attrs, etc). */
  renderOptions?: RenderOptionsParam
  /** Provide an existing Pinia instance. If omitted a fresh one is created. */
  pinia?: Pinia
  /** Provide an existing Vue Router instance. If omitted a minimal one is created. */
  router?: Router
  /** Initial route when a router isn't provided. */
  initialRoute?: string
  /** Routes to register on the auto-created router. */
  routes?: RouteRecordRaw[]
}

/**
 * Build a Vuetify instance configured identically to the real app so component
 * tests pick up the same defaults (density, variants, icons, etc).
 */
function makeVuetify() {
  return createVuetify({ components, directives })
}

/**
 * Create a bare-bones memory-history router for component tests that need one.
 * Tests can override routes or pass their own router entirely.
 */
function makeRouter(routes: RouteRecordRaw[], initialRoute: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes:
      routes.length > 0
        ? routes
        : [
            { path: '/', component: { template: '<div>home</div>' } },
            { path: '/:pathMatch(.*)*', component: { template: '<div>catch-all</div>' } },
          ],
  })
  void router.push(initialRoute)
  return router
}

/**
 * Render a component with Pinia + Vuetify + Vue Router all installed. Returns
 * the testing-library result plus the router/pinia that were used so tests can
 * assert on navigation or store state afterwards.
 */
export function renderWithPlugins(component: Component, options: RenderWithPluginsOptions = {}) {
  const pinia = options.pinia ?? createPinia()
  setActivePinia(pinia)

  const router = options.router ?? makeRouter(options.routes ?? [], options.initialRoute ?? '/')
  const vuetify = makeVuetify()

  const { renderOptions = {} } = options
  const existingGlobal = renderOptions.global ?? {}
  const existingPlugins = existingGlobal.plugins ?? []

  const result = render(component, {
    ...renderOptions,
    global: {
      ...existingGlobal,
      plugins: [...existingPlugins, pinia, router, vuetify],
    },
  })

  return { ...result, pinia, router }
}
