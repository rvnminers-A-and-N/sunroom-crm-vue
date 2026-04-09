import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/core/models/user'

const TOKEN_KEY = 'sunroom_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'Admin')

  async function login(request: LoginRequest) {
    const res = await apiClient.post<AuthResponse>('/auth/login', request)
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem(TOKEN_KEY, res.data.token)
  }

  async function register(request: RegisterRequest) {
    const res = await apiClient.post<AuthResponse>('/auth/register', request)
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem(TOKEN_KEY, res.data.token)
  }

  async function loadCurrentUser() {
    const res = await apiClient.get<User>('/auth/me')
    user.value = res.data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { user, token, isAuthenticated, isAdmin, login, register, loadCurrentUser, logout }
})
