import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'
import ResizeObserver from 'resize-observer-polyfill'
import { server } from './msw/server'

// ---------------------------------------------------------------------------
// jsdom polyfills that Vuetify depends on
// ---------------------------------------------------------------------------

// Vuetify uses ResizeObserver to measure layout; jsdom doesn't ship one.
globalThis.ResizeObserver = ResizeObserver

// Vuetify and several components call matchMedia.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

// Vuetify's goTo helper and some dialogs poke at visualViewport.
if (!window.visualViewport) {
  Object.defineProperty(window, 'visualViewport', {
    writable: true,
    configurable: true,
    value: {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    },
  })
}

// CSS.supports is touched by some Vuetify color calculations.
if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
  ;(globalThis as unknown as { CSS: { supports: () => boolean } }).CSS = {
    supports: () => false,
  }
}

// ---------------------------------------------------------------------------
// MSW lifecycle
// ---------------------------------------------------------------------------

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
