<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDealStore } from '@/stores/deal.store'
import type { Deal, DealStage } from '@/core/models/deal'
import type { PaginationMeta } from '@/core/models/pagination'
import { formatDate } from '@/shared/utils/formatDate'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import DealFormDialog from './DealFormDialog.vue'

const router = useRouter()
const dealStore = useDealStore()

const meta = ref<PaginationMeta>({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
const search = ref('')
const selectedStage = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout>>()

const showForm = ref(false)
const editingDeal = ref<Deal | null>(null)
const showDeleteConfirm = ref(false)
const deletingDeal = ref<Deal | null>(null)

const stages: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

function loadDeals() {
  dealStore
    .fetchDeals({
      page: meta.value.currentPage,
      perPage: meta.value.perPage,
      search: search.value || undefined,
      stage: selectedStage.value || undefined,
    })
    .then((m) => {
      if (m) meta.value = m
    })
}

onMounted(() => {
  loadDeals()
})

function onSearch(value: string) {
  search.value = value
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    meta.value.currentPage = 1
    loadDeals()
  }, 300)
}

function onStageFilter(stage: string) {
  selectedStage.value = stage
  meta.value.currentPage = 1
  loadDeals()
}

function onPage(opts: { page: number; itemsPerPage: number }) {
  meta.value.currentPage = opts.page
  meta.value.perPage = opts.itemsPerPage
  loadDeals()
}

function onRowClick(_: Event, row: { item: Deal }) {
  router.push({ name: 'deal-detail', params: { id: row.item.id } })
}

function openCreate() {
  editingDeal.value = null
  showForm.value = true
}

function openEdit(deal: Deal, event: Event) {
  event.stopPropagation()
  editingDeal.value = deal
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  loadDeals()
}

function confirmDelete(deal: Deal, event: Event) {
  event.stopPropagation()
  deletingDeal.value = deal
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingDeal.value) return
  await dealStore.deleteDeal(deletingDeal.value.id)
  loadDeals()
}

function getStageClass(stage: string): string {
  return 'stage-badge stage-badge--' + stage.toLowerCase()
}

const headers = [
  { title: 'Title', key: 'title', sortable: false },
  { title: 'Value', key: 'value', sortable: false },
  { title: 'Stage', key: 'stage', sortable: false },
  { title: 'Contact', key: 'contactName', sortable: false },
  { title: 'Company', key: 'companyName', sortable: false },
  { title: 'Expected Close', key: 'expectedCloseDate', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 100 },
]
</script>

<template>
  <PageHeader
    title="Deals"
    :subtitle="meta.total + ' total'"
    action-label="Add Deal"
    @action="openCreate"
  />

  <div class="deals-view-toggle">
    <v-btn variant="outlined" class="deals-view-toggle__active" :to="{ name: 'deals' }">
      <v-icon start>mdi-view-list</v-icon> List
    </v-btn>
    <v-btn variant="outlined" :to="{ name: 'deal-pipeline' }">
      <v-icon start>mdi-view-column</v-icon> Pipeline
    </v-btn>
  </div>

  <div class="deals-filters">
    <v-text-field
      :model-value="search"
      label="Search deals"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="deals-filters__search"
      @update:model-value="onSearch($event ?? '')"
    />
    <v-select
      :model-value="selectedStage"
      :items="[{ title: 'All stages', value: '' }, ...stages.map((s) => ({ title: s, value: s }))]"
      label="Filter by stage"
      variant="outlined"
      density="compact"
      hide-details
      class="deals-filters__stage"
      @update:model-value="onStageFilter($event)"
    />
  </div>

  <v-data-table-server
    v-if="dealStore.deals.length > 0 || dealStore.loading"
    :headers="headers"
    :items="dealStore.deals"
    :items-length="meta.total"
    :loading="dealStore.loading"
    :page="meta.currentPage"
    :items-per-page="meta.perPage"
    :items-per-page-options="[10, 25, 50]"
    class="sr-card"
    @update:options="onPage"
    @click:row="onRowClick"
  >
    <template #item.title="{ item }">
      <span class="font-weight-bold">{{ item.title }}</span>
    </template>
    <template #item.value="{ item }">${{ item.value.toLocaleString() }}</template>
    <template #item.stage="{ item }">
      <span :class="getStageClass(item.stage)">{{ item.stage }}</span>
    </template>
    <template #item.companyName="{ item }">{{ item.companyName || '—' }}</template>
    <template #item.expectedCloseDate="{ item }">
      {{ item.expectedCloseDate ? formatDate(item.expectedCloseDate) : '—' }}
    </template>
    <template #item.actions="{ item }">
      <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item, $event)" />
      <v-btn icon="mdi-delete" variant="text" size="small" @click="confirmDelete(item, $event)" />
    </template>
  </v-data-table-server>

  <EmptyState
    v-else-if="!dealStore.loading"
    icon="mdi-handshake"
    title="No deals yet"
    message="Create your first deal to start tracking your pipeline."
    action-label="Add Deal"
    @action="openCreate"
  />

  <DealFormDialog v-model="showForm" :deal="editingDeal" @saved="onFormSaved" />

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Deal"
    :message="`Are you sure you want to delete &quot;${deletingDeal?.title}&quot;?`"
    @confirm="onDelete"
  />
</template>

<style lang="scss" scoped>
.deals-view-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  &__active {
    background: rgba(2, 121, 95, 0.08) !important;
    color: var(--sr-primary) !important;
  }
}

.deals-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &__search {
    flex: 1;
    max-width: 400px;
  }

  &__stage {
    width: 200px;
  }
}

.stage-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;

  &--lead { background: #eff6ff; color: #2563eb; }
  &--qualified { background: #f0fdf4; color: #16a34a; }
  &--proposal { background: #fefce8; color: #ca8a04; }
  &--negotiation { background: #fff7ed; color: #ea580c; }
  &--won { background: rgba(2, 121, 95, 0.1); color: var(--sr-primary); }
  &--lost { background: #fef2f2; color: #dc2626; }
}

@media (max-width: 768px) {
  .deals-filters {
    flex-direction: column;

    &__search,
    &__stage {
      max-width: 100%;
      width: 100%;
    }
  }
}
</style>
