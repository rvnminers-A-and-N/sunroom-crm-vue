import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/vue'
import { http, HttpResponse } from 'msw'
import { createMemoryHistory, createRouter } from 'vue-router'
import { server } from '@/test/msw/server'
import { renderWithPlugins } from '@/test/render'
import { makeAuthResponse } from '@/test/fixtures'
import RegisterPage from '../RegisterPage.vue'

const API = 'http://localhost:5236/api'
const Stub = { template: '<div>stub</div>' }

function makeAuthRouter(initial = '/auth/register') {
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

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, getByLabelText: (l: string) => HTMLElement) {
  await user.type(getByLabelText('Full Name'), 'Ada Lovelace')
  await user.type(getByLabelText('Email'), 'ada@example.com')
  await user.type(getByLabelText('Password'), 'longerpassword')
  await user.type(getByLabelText('Confirm Password'), 'longerpassword')
}

describe('RegisterPage', () => {
  it('renders the heading and all four fields', () => {
    const { getByText, getByLabelText } = renderWithPlugins(RegisterPage, {
      router: makeAuthRouter(),
    })
    expect(getByText('Create an account')).toBeInTheDocument()
    expect(getByLabelText('Full Name')).toBeInTheDocument()
    expect(getByLabelText('Email')).toBeInTheDocument()
    expect(getByLabelText('Password')).toBeInTheDocument()
    expect(getByLabelText('Confirm Password')).toBeInTheDocument()
  })

  it('registers successfully and navigates to /dashboard', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(makeAuthResponse({ token: 'reg-token' })),
      ),
    )
    const router = makeAuthRouter()
    const user = userEvent.setup()
    const { getByLabelText, container } = renderWithPlugins(RegisterPage, { router })
    await fillValidForm(user, (l) => getByLabelText(l))
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    await new Promise((r) => setTimeout(r, 50))
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('shows a "passwords do not match" error and never submits when the confirmation differs', async () => {
    let postCount = 0
    server.use(
      http.post(`${API}/auth/register`, () => {
        postCount++
        return HttpResponse.json(makeAuthResponse())
      }),
    )
    const user = userEvent.setup()
    const { getByLabelText, container, findByText } = renderWithPlugins(RegisterPage, {
      router: makeAuthRouter(),
    })
    await user.type(getByLabelText('Full Name'), 'Ada Lovelace')
    await user.type(getByLabelText('Email'), 'ada@example.com')
    await user.type(getByLabelText('Password'), 'longerpassword')
    await user.type(getByLabelText('Confirm Password'), 'differentpassword')
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await findByText('Passwords do not match.')).toBeInTheDocument()
    expect(postCount).toBe(0)
  })

  it('surfaces the API error message on a failed registration', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json({ message: 'Email taken' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    const { getByLabelText, container, findByText } = renderWithPlugins(RegisterPage, {
      router: makeAuthRouter(),
    })
    await fillValidForm(user, (l) => getByLabelText(l))
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await findByText('Email taken')).toBeInTheDocument()
  })

  it('falls back to a generic error message when the response has no message', async () => {
    server.use(
      http.post(`${API}/auth/register`, () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    const { getByLabelText, container, findByText } = renderWithPlugins(RegisterPage, {
      router: makeAuthRouter(),
    })
    await fillValidForm(user, (l) => getByLabelText(l))
    await fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await findByText(/Registration failed/)).toBeInTheDocument()
  })

  it('toggles password visibility when the eye icon is clicked', async () => {
    const user = userEvent.setup()
    const { getByLabelText, container } = renderWithPlugins(RegisterPage, {
      router: makeAuthRouter(),
    })
    const pwInput = getByLabelText('Password') as HTMLInputElement
    expect(pwInput.type).toBe('password')
    const toggle = container.querySelector('.v-field__append-inner .v-icon') as HTMLElement
    expect(toggle).not.toBeNull()
    await user.click(toggle)
    expect(pwInput.type).toBe('text')
  })
})
