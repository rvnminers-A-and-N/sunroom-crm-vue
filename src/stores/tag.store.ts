import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { Tag, CreateTagRequest, UpdateTagRequest } from '@/core/models/tag'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])

  async function fetchTags() {
    const res = await apiClient.get<Tag[]>('/tags')
    tags.value = res.data
  }

  async function createTag(data: CreateTagRequest) {
    const res = await apiClient.post<Tag>('/tags', data)
    tags.value.push(res.data)
    return res.data
  }

  async function updateTag(id: number, data: UpdateTagRequest) {
    const res = await apiClient.put<Tag>(`/tags/${id}`, data)
    const idx = tags.value.findIndex((t) => t.id === id)
    if (idx !== -1) tags.value[idx] = res.data
    return res.data
  }

  async function deleteTag(id: number) {
    await apiClient.delete(`/tags/${id}`)
    tags.value = tags.value.filter((t) => t.id !== id)
  }

  return { tags, fetchTags, createTag, updateTag, deleteTag }
})
