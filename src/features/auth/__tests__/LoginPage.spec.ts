import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeAuthResponse } from '@/test/fixtures'
import LoginPage from '../LoginPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

function makeAuthRouter(initial = '/auth/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'login', component: Stub },
      { path: '/dashboard', name: 'dashboard', component: Stub },
      { path: '/auth/register', name: 'register', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

describe('LoginPage', () => {
  it('renders the heading and form fields', () => {
    const { getByText, getByLabelText } = renderWithPlugins(LoginPage, {
      router: makeAuthRouter(),
    })
    expect(getByText('Welcome back')).toBeInTheDocument()
    expect(getByLabelText('Email')).toBeInTheDocument()
    expect(getByLabelText('Password')).toBeInTheDocument()
  })

  it('logs in successfully and navigates to /dashboard', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(makeAuthResponse({ token: 'good-token' })),
      ),
    )
    const router = makeAuthRouter()
    const user = userEvent.setup()
    const { getByLabelText, container } = renderWithPlugins(LoginPage, { router })
    await user.type(getByLabelText('Email'), 'ada@example.com')
    await user.type(getByLabelText('Password'), 'secret123')
    const form = container.querySelector('form') as HTMLFormElement
    await fireEvent.submit(form)
    // Wait for the navigation to settle.
    await new Promise((r) => setTimeout(r, 50))
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('shows the API error message when the login request fails with a body', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    const { getByLabelText, container, findByText } = renderWithPlugins(LoginPage, {
      router: makeAuthRouter(),
    })
    await user.type(getByLabelText('Email'), 'ada@example.com')
    await user.type(getByLabelText('Password'), 'wrongpw')
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('falls back to a generic error message when the response has no message', async () => {
    server.use(
      http.post(`${API}/auth/login`, () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    const { getByLabelText, container, findByText } = renderWithPlugins(LoginPage, {
      router: makeAuthRouter(),
    })
    await user.type(getByLabelText('Email'), 'ada@example.com')
    await user.type(getByLabelText('Password'), 'secret123')
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await findByText(/Login failed/)).toBeInTheDocument()
  })

  it('toggles password visibility when the eye icon is clicked', async () => {
    const user = userEvent.setup()
    const { getByLabelText, container } = renderWithPlugins(LoginPage, {
      router: makeAuthRouter(),
    })
    const pwInput = getByLabelText('Password') as HTMLInputElement
    expect(pwInput.type).toBe('password')
    const toggle = container.querySelector('.v-field__append-inner .v-icon') as HTMLElement
    expect(toggle).not.toBeNull()
    await user.click(toggle)
    expect(pwInput.type).toBe('text')
    await user.click(toggle)
    expect(pwInput.type).toBe('password')
  })
})
