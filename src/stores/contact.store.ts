import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/core/api/client'
import type { Contact, ContactDetail, CreateContactRequest, UpdateContactRequest, ContactFilterParams } from '@/core/models/contact'
import type { PaginatedResponse } from '@/core/models/pagination'

export const useContactStore = defineStore('contact', () => {
  const contacts = ref<Contact[]>([])
  const contact = ref<ContactDetail | null>(null)
  const total = ref(0)
  const loading = ref(false)

  async function fetchContacts(params: ContactFilterParams) {
    loading.value = true
    try {
      const res = await apiClient.get<PaginatedResponse<Contact>>('/contacts', { params })
      contacts.value = res.data.data
      total.value = res.data.meta.total
      return res.data.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchContact(id: number) {
    loading.value = true
    try {
      const res = await apiClient.get<ContactDetail>(`/contacts/${id}`)
      contact.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createContact(data: CreateContactRequest) {
    await apiClient.post('/contacts', data)
  }

  async function updateContact(id: number, data: UpdateContactRequest) {
    await apiClient.put(`/contacts/${id}`, data)
  }

  async function deleteContact(id: number) {
    await apiClient.delete(`/contacts/${id}`)
  }

  async function syncTags(contactId: number, tagIds: number[]) {
    await apiClient.put(`/contacts/${contactId}/tags`, tagIds)
  }

  return { contacts, contact, total, loading, fetchContacts, fetchContact, createContact, updateContact, deleteContact, syncTags }
})
