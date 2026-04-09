<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useActivityStore } from '@/stores/activity.store'
import type { Activity, ActivityType } from '@/core/models/activity'
import type { PaginationMeta } from '@/core/models/pagination'
import { formatDateTime } from '@/shared/utils/formatDate'
import PageHeader from '@/shared/components/PageHeader.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import ActivityIcon from '@/shared/components/ActivityIcon.vue'
import ActivityFormDialog from './ActivityFormDialog.vue'

const activityStore = useActivityStore()

const meta = ref<PaginationMeta>({ currentPage: 1, perPage: 10, total: 0, lastPage: 1 })
const selectedType = ref('')

const showForm = ref(false)
const editingActivity = ref<Activity | null>(null)
const showDeleteConfirm = ref(false)
const deletingActivity = ref<Activity | null>(null)

const types: ActivityType[] = ['Note', 'Call', 'Email', 'Meeting', 'Task']

function loadActivities() {
  activityStore
    .fetchActivities({
      page: meta.value.currentPage,
      perPage: meta.value.perPage,
      type: selectedType.value || undefined,
    })
    .then((m) => {
      if (m) meta.value = m
    })
}

onMounted(() => {
  loadActivities()
})

function onTypeFilter(type: string) {
  selectedType.value = type
  meta.value.currentPage = 1
  loadActivities()
}

function onPage(opts: { page: number; itemsPerPage: number }) {
  meta.value.currentPage = opts.page
  meta.value.perPage = opts.itemsPerPage
  loadActivities()
}

function openCreate() {
  editingActivity.value = null
  showForm.value = true
}

function openEdit(activity: Activity, event: Event) {
  event.stopPropagation()
  editingActivity.value = activity
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  loadActivities()
}

function confirmDelete(activity: Activity, event: Event) {
  event.stopPropagation()
  deletingActivity.value = activity
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingActivity.value) return
  await activityStore.deleteActivity(deletingActivity.value.id)
  loadActivities()
}

const headers = [
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Subject', key: 'subject', sortable: false },
  { title: 'Contact', key: 'contactName', sortable: false },
  { title: 'Deal', key: 'dealTitle', sortable: false },
  { title: 'Date', key: 'occurredAt', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 100 },
]
</script>

<template>
  <PageHeader
    title="Activities"
    :subtitle="meta.total + ' total'"
    action-label="Log Activity"
    @action="openCreate"
  />

  <div class="activities-filters">
    <v-select
      :model-value="selectedType"
      :items="[{ title: 'All types', value: '' }, ...types.map((t) => ({ title: t, value: t }))]"
      label="Filter by type"
      variant="outlined"
      density="compact"
      hide-details
      class="activities-filters__type"
      @update:model-value="onTypeFilter($event)"
    />
  </div>

  <v-data-table-server
    v-if="activityStore.activities.length > 0 || activityStore.loading"
    :headers="headers"
    :items="activityStore.activities"
    :items-length="meta.total"
    :loading="activityStore.loading"
    :page="meta.currentPage"
    :items-per-page="meta.perPage"
    :items-per-page-options="[10, 25, 50]"
    class="sr-card"
    @update:options="onPage"
  >
    <template #item.type="{ item }">
      <div class="d-flex align-center ga-2">
        <ActivityIcon :type="item.type" />
        <span class="text-body-2 font-weight-medium">{{ item.type }}</span>
      </div>
    </template>
    <template #item.subject="{ item }">
      <span class="font-weight-bold">{{ item.subject }}</span>
    </template>
    <template #item.contactName="{ item }">
      <router-link
        v-if="item.contactId"
        :to="{ name: 'contact-detail', params: { id: item.contactId } }"
        class="table-link"
      >
        {{ item.contactName }}
      </router-link>
      <span v-else>—</span>
    </template>
    <template #item.dealTitle="{ item }">
      <router-link
        v-if="item.dealId"
        :to="{ name: 'deal-detail', params: { id: item.dealId } }"
        class="table-link"
      >
        {{ item.dealTitle }}
      </router-link>
      <span v-else>—</span>
    </template>
    <template #item.occurredAt="{ item }">
      {{ formatDateTime(item.occurredAt) }}
    </template>
    <template #item.actions="{ item }">
      <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item, $event)" />
      <v-btn icon="mdi-delete" variant="text" size="small" @click="confirmDelete(item, $event)" />
    </template>
  </v-data-table-server>

  <EmptyState
    v-else-if="!activityStore.loading"
    icon="mdi-history"
    title="No activities yet"
    message="Log your first activity to start tracking interactions."
    action-label="Log Activity"
    @action="openCreate"
  />

  <ActivityFormDialog v-model="showForm" :activity="editingActivity" @saved="onFormSaved" />

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Activity"
    :message="`Are you sure you want to delete &quot;${deletingActivity?.subject}&quot;?`"
    @confirm="onDelete"
  />
</template>

<style lang="scss" scoped>
.activities-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &__type {
    width: 200px;
  }
}

.table-link {
  color: var(--sr-primary);
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

@media (max-width: 768px) {
  .activities-filters__type {
    width: 100%;
  }
}
</style>
