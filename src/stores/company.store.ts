import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { Company, CompanyDetail, CreateCompanyRequest, UpdateCompanyRequest } from '@/core/models/company'
import type { PaginatedResponse } from '@/core/models/pagination'

export const useCompanyStore = defineStore('company', () => {
  const companies = ref<Company[]>([])
  const company = ref<CompanyDetail | null>(null)
  const total = ref(0)
  const loading = ref(false)

  async function fetchCompanies(page: number, perPage: number, search?: string) {
    loading.value = true
    try {
      const params: Record<string, unknown> = { page, perPage }
      if (search) params.search = search
      const res = await apiClient.get<PaginatedResponse<Company>>('/companies', { params })
      companies.value = res.data.data
      total.value = res.data.meta.total
      return res.data.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchCompany(id: number) {
    loading.value = true
    try {
      const res = await apiClient.get<CompanyDetail>(`/companies/${id}`)
      company.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createCompany(data: CreateCompanyRequest) {
    await apiClient.post('/companies', data)
  }

  async function updateCompany(id: number, data: UpdateCompanyRequest) {
    await apiClient.put(`/companies/${id}`, data)
  }

  async function deleteCompany(id: number) {
    await apiClient.delete(`/companies/${id}`)
  }

  return { companies, company, total, loading, fetchCompanies, fetchCompany, createCompany, updateCompany, deleteCompany }
})
