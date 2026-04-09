import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { User, UpdateUserRequest } from '@/core/models/user'

export const useAdminStore = defineStore('admin', () => {
  const users = ref<User[]>([])
  const loading = ref(false)

  async function fetchUsers() {
    loading.value = true
    try {
      const res = await apiClient.get<User[]>('/admin/users')
      users.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, data: UpdateUserRequest) {
    const res = await apiClient.put<User>(`/admin/users/${id}`, data)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx !== -1) users.value[idx] = res.data
  }

  async function deleteUser(id: number) {
    await apiClient.delete(`/admin/users/${id}`)
    users.value = users.value.filter((u) => u.id !== id)
  }

  return { users, loading, fetchUsers, updateUser, deleteUser }
})
