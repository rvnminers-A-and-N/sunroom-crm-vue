import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type {
  Deal,
  DealDetail,
  DealFilterParams,
  CreateDealRequest,
  UpdateDealRequest,
  Pipeline,
} from '@/core/models/deal'
import type { PaginatedResponse } from '@/core/models/pagination'

export const useDealStore = defineStore('deal', () => {
  const deals = ref<Deal[]>([])
  const deal = ref<DealDetail | null>(null)
  const total = ref(0)
  const loading = ref(false)
  const pipeline = ref<Pipeline | null>(null)

  async function fetchDeals(params: DealFilterParams) {
    loading.value = true
    try {
      const res = await apiClient.get<PaginatedResponse<Deal>>('/deals', { params })
      deals.value = res.data.data
      total.value = res.data.meta.total
      return res.data.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchDeal(id: number) {
    loading.value = true
    try {
      const res = await apiClient.get<DealDetail>(`/deals/${id}`)
      deal.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchPipeline() {
    loading.value = true
    try {
      const res = await apiClient.get<Pipeline>('/deals/pipeline')
      pipeline.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createDeal(data: CreateDealRequest) {
    await apiClient.post('/deals', data)
  }

  async function updateDeal(id: number, data: UpdateDealRequest) {
    await apiClient.put(`/deals/${id}`, data)
  }

  async function deleteDeal(id: number) {
    await apiClient.delete(`/deals/${id}`)
  }

  return { deals, deal, total, loading, pipeline, fetchDeals, fetchDeal, fetchPipeline, createDeal, updateDeal, deleteDeal }
})
