import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { SmartSearchResponse, SummarizeResponse } from '@/core/models/ai'

export const useAiStore = defineStore('ai', () => {
  const searching = ref(false)
  const searchResult = ref<SmartSearchResponse | null>(null)
  const summarizing = ref(false)
  const summaryResult = ref<string | null>(null)

  async function smartSearch(query: string) {
    searching.value = true
    searchResult.value = null
    try {
      const res = await apiClient.post<SmartSearchResponse>('/ai/search', { query })
      searchResult.value = res.data
    } finally {
      searching.value = false
    }
  }

  async function summarize(text: string) {
    summarizing.value = true
    summaryResult.value = null
    try {
      const res = await apiClient.post<SummarizeResponse>('/ai/summarize', { text })
      summaryResult.value = res.data.summary
    } finally {
      summarizing.value = false
    }
  }

  return { searching, searchResult, summarizing, summaryResult, smartSearch, summarize }
})
