import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { Activity, ActivityFilterParams, CreateActivityRequest, UpdateActivityRequest } from '@/core/models/activity'
import type { PaginatedResponse } from '@/core/models/pagination'

export const useActivityStore = defineStore('activity', () => {
  const activities = ref<Activity[]>([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchActivities(params: ActivityFilterParams) {
    loading.value = true
    try {
      const res = await apiClient.get<PaginatedResponse<Activity>>('/activities', { params })
      activities.value = res.data.data
      total.value = res.data.meta.total
      return res.data.meta
    } finally {
      loading.value = false
    }
  }

  async function createActivity(data: CreateActivityRequest) {
    await apiClient.post('/activities', data)
  }

  async function updateActivity(id: number, data: UpdateActivityRequest) {
    await apiClient.put(`/activities/${id}`, data)
  }

  async function deleteActivity(id: number) {
    await apiClient.delete(`/activities/${id}`)
  }

  return { activities, total, loading, fetchActivities, createActivity, updateActivity, deleteActivity }
})
