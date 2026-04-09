<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDealStore } from '@/stores/deal.store'
import { formatDate, formatDateTime } from '@/shared/utils/formatDate'
import { relativeTime } from '@/shared/utils/relativeTime'
import type { DealStage } from '@/core/models/deal'
import ActivityIcon from '@/shared/components/ActivityIcon.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import DealFormDialog from './DealFormDialog.vue'

const route = useRoute()
const router = useRouter()
const dealStore = useDealStore()
const d = computed(() => dealStore.deal)

const showForm = ref(false)
const showDeleteConfirm = ref(false)

const ALL_STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

const currentStageIndex = computed(() => {
  if (!d.value) return 0
  const idx = ALL_STAGES.indexOf(d.value.stage as DealStage)
  return idx >= 0 ? idx : 0
})

onMounted(() => {
  dealStore.fetchDeal(Number(route.params.id))
})

function openEdit() {
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  dealStore.fetchDeal(Number(route.params.id))
}

async function onDelete() {
  if (!d.value) return
  await dealStore.deleteDeal(d.value.id)
  router.push({ name: 'deals' })
}

function getStageClass(stage: string): string {
  return 'stage-badge stage-badge--' + stage.toLowerCase()
}
</script>

<template>
  <template v-if="d">
    <div class="deal-detail">
      <div class="deal-detail__header">
        <v-btn icon="mdi-arrow-left" variant="text" @click="router.push({ name: 'deals' })" />
        <div class="deal-detail__title">
          <h1>{{ d.title }}</h1>
          <div class="deal-detail__meta">
            <span :class="getStageClass(d.stage)">{{ d.stage }}</span>
            <span class="deal-detail__value">${{ d.value.toLocaleString() }}</span>
          </div>
        </div>
        <div class="deal-detail__actions">
          <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="openEdit">Edit</v-btn>
          <v-btn variant="outlined" color="error" prepend-icon="mdi-delete" @click="showDeleteConfirm = true">
            Delete
          </v-btn>
        </div>
      </div>

      <!-- Stage Stepper -->
      <v-card class="deal-detail__stepper">
        <v-stepper :model-value="currentStageIndex + 1" alt-labels flat>
          <v-stepper-header>
            <template v-for="(stage, i) in ALL_STAGES" :key="stage">
              <v-stepper-item :value="i + 1" :title="stage" :complete="i < currentStageIndex" />
              <v-divider v-if="i < ALL_STAGES.length - 1" />
            </template>
          </v-stepper-header>
        </v-stepper>
      </v-card>

      <div class="deal-detail__body">
        <v-card class="deal-detail__info">
          <v-card-text>
            <div class="info-grid">
              <div class="info-item">
                <v-icon size="18">mdi-account</v-icon>
                <router-link :to="{ name: 'contact-detail', params: { id: d.contactId } }">
                  {{ d.contactName }}
                </router-link>
              </div>
              <div v-if="d.companyName" class="info-item">
                <v-icon size="18">mdi-domain</v-icon>
                <router-link :to="{ name: 'company-detail', params: { id: d.companyId } }">
                  {{ d.companyName }}
                </router-link>
              </div>
              <div v-if="d.expectedCloseDate" class="info-item">
                <v-icon size="18">mdi-calendar</v-icon>
                <span>Expected close: {{ formatDate(d.expectedCloseDate) }}</span>
              </div>
              <div v-if="d.closedAt" class="info-item">
                <v-icon size="18">mdi-check-circle</v-icon>
                <span>Closed: {{ formatDate(d.closedAt) }}</span>
              </div>
              <div class="info-item">
                <v-icon size="18">mdi-calendar-plus</v-icon>
                <span>Created {{ formatDate(d.createdAt) }}</span>
              </div>
            </div>
            <div v-if="d.notes" class="deal-detail__notes">
              <h4>Notes</h4>
              <p>{{ d.notes }}</p>
            </div>
          </v-card-text>
        </v-card>

        <div class="deal-detail__panels">
          <!-- Activities -->
          <v-card class="panel-section">
            <v-card-text>
              <h3>Activities ({{ d.activities.length }})</h3>
              <div v-if="d.activities.length > 0" class="activity-timeline">
                <div v-for="a in d.activities" :key="a.id" class="activity-item">
                  <ActivityIcon :type="a.type" />
                  <div class="activity-item__content">
                    <span class="activity-item__subject">{{ a.subject }}</span>
                    <span class="activity-item__time">{{ relativeTime(a.occurredAt) }}</span>
                    <p v-if="a.body" class="activity-item__body">{{ a.body }}</p>
                  </div>
                </div>
              </div>
              <p v-else class="panel-empty">No activities recorded</p>
            </v-card-text>
          </v-card>

          <!-- AI Insights -->
          <v-card v-if="d.insights.length > 0" class="panel-section">
            <v-card-text>
              <h3>
                <v-icon size="20" color="primary" class="mr-2">mdi-auto-fix</v-icon>
                AI Insights
              </h3>
              <div class="insights-list">
                <div v-for="insight in d.insights" :key="insight.id" class="insight-item">
                  <p>{{ insight.insight }}</p>
                  <span class="insight-item__date">{{ formatDateTime(insight.generatedAt) }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <DealFormDialog v-model="showForm" :deal="d" @saved="onFormSaved" />

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Deal"
      :message="`Are you sure you want to delete &quot;${d.title}&quot;?`"
      @confirm="onDelete"
    />
  </template>

  <div v-else-if="dealStore.loading" class="sr-loading">
    <v-progress-circular indeterminate color="primary" />
    <span>Loading deal...</span>
  </div>
</template>

<style lang="scss" scoped>
.deal-detail {
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__title {
    flex: 1;

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      color: var(--sr-text);
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
  }

  &__value {
    font-size: 18px;
    font-weight: 700;
    color: var(--sr-primary);
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__stepper {
    margin-bottom: 24px;
    overflow: hidden;
  }

  &__body {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 24px;
    align-items: start;
  }

  &__notes {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;

    h4 {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    p {
      font-size: 14px;
      color: var(--sr-text);
      margin: 0;
      white-space: pre-wrap;
    }
  }

  &__panels {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: var(--sr-text);

  a {
    color: var(--sr-primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
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

.panel-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--sr-text);
  display: flex;
  align-items: center;
}

.panel-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 16px 0;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__subject {
    font-size: 14px;
    font-weight: 500;
    color: var(--sr-text);
  }

  &__time {
    font-size: 12px;
    color: #9ca3af;
    margin-left: 8px;
  }

  &__body {
    font-size: 13px;
    color: #6b7280;
    margin: 4px 0 0;
    white-space: pre-wrap;
  }
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-item {
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border-left: 3px solid var(--sr-primary);

  p {
    font-size: 14px;
    color: var(--sr-text);
    margin: 0 0 6px;
    line-height: 1.5;
  }

  &__date {
    font-size: 11px;
    color: #9ca3af;
  }
}

@media (max-width: 1024px) {
  .deal-detail__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .deal-detail__header {
    flex-wrap: wrap;
  }

  .deal-detail__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .deal-detail__stepper {
    overflow-x: auto;
  }
}
</style>
