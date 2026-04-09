<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContactStore } from '@/stores/contact.store'
import { useTagStore } from '@/stores/tag.store'
import type { Contact } from '@/core/models/contact'
import type { PaginationMeta } from '@/core/models/pagination'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import TagChip from '@/shared/components/TagChip.vue'
import ContactFormDialog from './ContactFormDialog.vue'

const router = useRouter()
const contactStore = useContactStore()
const tagStore = useTagStore()

const meta = ref<PaginationMeta>({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
const search = ref('')
const selectedTagId = ref<number | null>(null)
const searchTimeout = ref<ReturnType<typeof setTimeout>>()

const showForm = ref(false)
const editingContact = ref<Contact | null>(null)
const showDeleteConfirm = ref(false)
const deletingContact = ref<Contact | null>(null)

function loadContacts() {
  contactStore
    .fetchContacts({
      page: meta.value.currentPage,
      perPage: meta.value.perPage,
      search: search.value || undefined,
      tagId: selectedTagId.value ?? undefined,
    })
    .then((m) => {
      if (m) meta.value = m
    })
}

onMounted(() => {
  loadContacts()
  tagStore.fetchTags()
})

function onSearch(value: string) {
  search.value = value
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    meta.value.currentPage = 1
    loadContacts()
  }, 300)
}

function onTagFilter(tagId: number | null) {
  selectedTagId.value = tagId
  meta.value.currentPage = 1
  loadContacts()
}

function onPage(opts: { page: number; itemsPerPage: number }) {
  meta.value.currentPage = opts.page
  meta.value.perPage = opts.itemsPerPage
  loadContacts()
}

function onRowClick(_: Event, row: { item: Contact }) {
  router.push({ name: 'contact-detail', params: { id: row.item.id } })
}

function openCreate() {
  editingContact.value = null
  showForm.value = true
}

function openEdit(contact: Contact, event: Event) {
  event.stopPropagation()
  editingContact.value = contact
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  loadContacts()
}

function confirmDelete(contact: Contact, event: Event) {
  event.stopPropagation()
  deletingContact.value = contact
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingContact.value) return
  await contactStore.deleteContact(deletingContact.value.id)
  loadContacts()
}

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Company', key: 'companyName', sortable: false },
  { title: 'Tags', key: 'tags', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 100 },
]
</script>

<template>
  <PageHeader
    :title="'Contacts'"
    :subtitle="meta.total + ' total'"
    action-label="Add Contact"
    @action="openCreate"
  />

  <div class="contacts-filters">
    <v-text-field
      :model-value="search"
      label="Search contacts"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="contacts-filters__search"
      @update:model-value="onSearch($event ?? '')"
    />

    <v-select
      :model-value="selectedTagId"
      :items="[{ title: 'All tags', value: null }, ...tagStore.tags.map((t) => ({ title: t.name, value: t.id }))]"
      label="Filter by tag"
      variant="outlined"
      density="compact"
      hide-details
      class="contacts-filters__tag"
      @update:model-value="onTagFilter($event)"
    />
  </div>

  <v-data-table-server
    v-if="contactStore.contacts.length > 0 || contactStore.loading"
    :headers="headers"
    :items="contactStore.contacts"
    :items-length="meta.total"
    :loading="contactStore.loading"
    :page="meta.currentPage"
    :items-per-page="meta.perPage"
    :items-per-page-options="[10, 25, 50]"
    class="sr-card"
    @update:options="onPage"
    @click:row="onRowClick"
  >
    <template #item.name="{ item }">
      <div>
        <span class="font-weight-medium">{{ item.firstName }} {{ item.lastName }}</span>
        <div v-if="item.title" class="text-caption text-grey">{{ item.title }}</div>
      </div>
    </template>
    <template #item.email="{ item }">{{ item.email || '—' }}</template>
    <template #item.phone="{ item }">{{ item.phone || '—' }}</template>
    <template #item.companyName="{ item }">{{ item.companyName || '—' }}</template>
    <template #item.tags="{ item }">
      <div class="d-flex ga-1 flex-wrap">
        <TagChip v-for="tag in item.tags" :key="tag.id" :tag="tag" />
      </div>
    </template>
    <template #item.actions="{ item }">
      <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item, $event)" />
      <v-btn icon="mdi-delete" variant="text" size="small" @click="confirmDelete(item, $event)" />
    </template>
  </v-data-table-server>

  <EmptyState
    v-else-if="!contactStore.loading"
    icon="mdi-account-group"
    title="No contacts yet"
    message="Add your first contact to get started."
    action-label="Add Contact"
    @action="openCreate"
  />

  <ContactFormDialog
    v-model="showForm"
    :contact="editingContact"
    @saved="onFormSaved"
  />

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Contact"
    :message="`Are you sure you want to delete ${deletingContact?.firstName} ${deletingContact?.lastName}?`"
    @confirm="onDelete"
  />
</template>

<style lang="scss" scoped>
.contacts-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &__search {
    max-width: 320px;
  }

  &__tag {
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .contacts-filters {
    flex-direction: column;

    &__search,
    &__tag {
      max-width: 100%;
    }
  }
}
</style>
