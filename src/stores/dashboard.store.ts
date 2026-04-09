import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { DashboardData } from '@/core/models/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardData | null>(null)
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      const res = await apiClient.get<DashboardData>('/dashboard')
      data.value = res.data
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchDashboard }
})
