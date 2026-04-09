<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanyStore } from '@/stores/company.store'
import type { Company } from '@/core/models/company'
import type { PaginationMeta } from '@/core/models/pagination'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import CompanyFormDialog from './CompanyFormDialog.vue'

const router = useRouter()
const companyStore = useCompanyStore()

const meta = ref<PaginationMeta>({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
const search = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout>>()

const showForm = ref(false)
const editingCompany = ref<Company | null>(null)
const showDeleteConfirm = ref(false)
const deletingCompany = ref<Company | null>(null)

function loadCompanies() {
  companyStore
    .fetchCompanies(meta.value.currentPage, meta.value.perPage, search.value || undefined)
    .then((m) => {
      if (m) meta.value = m
    })
}

onMounted(() => {
  loadCompanies()
})

function onSearch(value: string) {
  search.value = value
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    meta.value.currentPage = 1
    loadCompanies()
  }, 300)
}

function onPage(opts: { page: number; itemsPerPage: number }) {
  meta.value.currentPage = opts.page
  meta.value.perPage = opts.itemsPerPage
  loadCompanies()
}

function onRowClick(_: Event, row: { item: Company }) {
  router.push({ name: 'company-detail', params: { id: row.item.id } })
}

function openCreate() {
  editingCompany.value = null
  showForm.value = true
}

function openEdit(company: Company, event: Event) {
  event.stopPropagation()
  editingCompany.value = company
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  loadCompanies()
}

function confirmDelete(company: Company, event: Event) {
  event.stopPropagation()
  deletingCompany.value = company
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingCompany.value) return
  await companyStore.deleteCompany(deletingCompany.value.id)
  loadCompanies()
}

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Industry', key: 'industry', sortable: false },
  { title: 'Location', key: 'location', sortable: false },
  { title: 'Contacts', key: 'contactCount', sortable: false },
  { title: 'Deals', key: 'dealCount', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 100 },
]
</script>

<template>
  <PageHeader
    title="Companies"
    :subtitle="meta.total + ' total'"
    action-label="Add Company"
    @action="openCreate"
  />

  <div class="companies-filters">
    <v-text-field
      :model-value="search"
      label="Search companies"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="companies-filters__search"
      @update:model-value="onSearch($event ?? '')"
    />
  </div>

  <v-data-table-server
    v-if="companyStore.companies.length > 0 || companyStore.loading"
    :headers="headers"
    :items="companyStore.companies"
    :items-length="meta.total"
    :loading="companyStore.loading"
    :page="meta.currentPage"
    :items-per-page="meta.perPage"
    :items-per-page-options="[10, 25, 50]"
    class="sr-card"
    @update:options="onPage"
    @click:row="onRowClick"
  >
    <template #item.name="{ item }">
      <span class="font-weight-medium">{{ item.name }}</span>
    </template>
    <template #item.industry="{ item }">{{ item.industry || '—' }}</template>
    <template #item.location="{ item }">
      <template v-if="item.city || item.state">
        {{ item.city }}{{ item.city && item.state ? ', ' : '' }}{{ item.state }}
      </template>
      <template v-else>—</template>
    </template>
    <template #item.actions="{ item }">
      <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item, $event)" />
      <v-btn icon="mdi-delete" variant="text" size="small" @click="confirmDelete(item, $event)" />
    </template>
  </v-data-table-server>

  <EmptyState
    v-else-if="!companyStore.loading"
    icon="mdi-domain"
    title="No companies yet"
    message="Add your first company to get started."
    action-label="Add Company"
    @action="openCreate"
  />

  <CompanyFormDialog v-model="showForm" :company="editingCompany" @saved="onFormSaved" />

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Company"
    :message="`Are you sure you want to delete ${deletingCompany?.name}?`"
    @confirm="onDelete"
  />
</template>

<style lang="scss" scoped>
.companies-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &__search {
    max-width: 320px;
  }
}

@media (max-width: 768px) {
  .companies-filters__search {
    max-width: 100%;
  }
}
</style>
