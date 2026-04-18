import { ref } from 'vue'
import { defineStore } from 'pinia'
import { streamSSE } from '@/core/api/sse-stream'

const TOKEN_KEY = 'sunroom_token'

export const useAiStore = defineStore('ai', () => {
  const searching = ref(false)
  const searchResult = ref<string | null>(null)
  const summarizing = ref(false)
  const summaryResult = ref<string | null>(null)
  const generatingInsights = ref(false)
  const insightsResult = ref<string | null>(null)

  let searchAbortController: AbortController | null = null
  let summarizeAbortController: AbortController | null = null
  let insightsAbortController: AbortController | null = null

  async function smartSearch(query: string) {
    searchAbortController?.abort()
    searchAbortController = new AbortController()

    searching.value = true
    searchResult.value = ''

    try {
      const token = localStorage.getItem(TOKEN_KEY)
      for await (const chunk of streamSSE(
        '/ai/search/stream',
        { query },
        token,
        searchAbortController.signal,
      )) {
        searchResult.value += chunk
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        searchResult.value = `Error: ${(e as Error).message}`
      }
    } finally {
      searching.value = false
    }
  }

  async function summarize(text: string) {
    summarizeAbortController?.abort()
    summarizeAbortController = new AbortController()

    summarizing.value = true
    summaryResult.value = ''

    try {
      const token = localStorage.getItem(TOKEN_KEY)
      for await (const chunk of streamSSE(
        '/ai/summarize/stream',
        { text },
        token,
        summarizeAbortController.signal,
      )) {
        summaryResult.value += chunk
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        summaryResult.value = `Error: ${(e as Error).message}`
      }
    } finally {
      summarizing.value = false
    }
  }

  async function dealInsights(dealId: number) {
    insightsAbortController?.abort()
    insightsAbortController = new AbortController()

    generatingInsights.value = true
    insightsResult.value = ''

    try {
      const token = localStorage.getItem(TOKEN_KEY)
      for await (const chunk of streamSSE(
        `/ai/deal-insights/${dealId}/stream`,
        {},
        token,
        insightsAbortController.signal,
      )) {
        insightsResult.value += chunk
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        insightsResult.value = `Error: ${(e as Error).message}`
      }
    } finally {
      generatingInsights.value = false
    }
  }

  return { searching, searchResult, summarizing, summaryResult, generatingInsights, insightsResult, smartSearch, summarize, dealInsights }
})
