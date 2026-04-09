<script setup lang="ts">
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { useDealStore } from '@/stores/deal.store'
import type { Deal, PipelineStage } from '@/core/models/deal'
import { currencyShort } from '@/shared/utils/currencyShort'
import PageHeader from '@/shared/components/PageHeader.vue'
import DealCard from './DealCard.vue'
import DealFormDialog from './DealFormDialog.vue'

const dealStore = useDealStore()

const stages = ref<PipelineStage[]>([])
const showForm = ref(false)

const STAGE_COLORS: Record<string, string> = {
  Lead: '#2563eb',
  Qualified: '#16a34a',
  Proposal: '#ca8a04',
  Negotiation: '#ea580c',
  Won: '#02795f',
  Lost: '#dc2626',
}

onMounted(async () => {
  await dealStore.fetchPipeline()
  if (dealStore.pipeline) {
    stages.value = dealStore.pipeline.stages.map((s) => ({
      ...s,
      deals: [...s.deals],
    }))
  }
})

function onDragChange(targetStage: PipelineStage, evt: { added?: { element: Deal } }) {
  if (!evt.added) return
  const deal = evt.added.element

  // Update counts
  const sourceStage = stages.value.find(
    (s) => s.stage !== targetStage.stage && s.deals.some((d) => d.id === deal.id),
  )
  if (sourceStage) {
    sourceStage.deals = sourceStage.deals.filter((d) => d.id !== deal.id)
    sourceStage.count--
    sourceStage.totalValue -= deal.value
  }
  targetStage.count = targetStage.deals.length
  targetStage.totalValue = targetStage.deals.reduce((sum, d) => sum + d.value, 0)

  // Persist
  dealStore
    .updateDeal(deal.id, {
      title: deal.title,
      value: deal.value,
      contactId: deal.contactId,
      companyId: deal.companyId ?? undefined,
      stage: targetStage.stage,
      expectedCloseDate: deal.expectedCloseDate ?? undefined,
    })
    .catch(() => {
      // Reload on error
      loadPipeline()
    })
}

async function loadPipeline() {
  await dealStore.fetchPipeline()
  if (dealStore.pipeline) {
    stages.value = dealStore.pipeline.stages.map((s) => ({
      ...s,
      deals: [...s.deals],
    }))
  }
}

function onFormSaved() {
  showForm.value = false
  loadPipeline()
}
</script>

<template>
  <PageHeader
    title="Pipeline"
    subtitle="Drag deals between stages"
    action-label="Add Deal"
    @action="showForm = true"
  />

  <div class="view-toggle">
    <v-btn variant="outlined" :to="{ name: 'deals' }">
      <v-icon start>mdi-view-list</v-icon> List
    </v-btn>
    <v-btn variant="outlined" class="view-toggle__active" :to="{ name: 'deal-pipeline' }">
      <v-icon start>mdi-view-column</v-icon> Pipeline
    </v-btn>
  </div>

  <div class="pipeline">
    <div v-for="stage in stages" :key="stage.stage" class="pipeline__column">
      <div class="pipeline__header" :style="{ borderColor: STAGE_COLORS[stage.stage] ?? '#6b7280' }">
        <div class="pipeline__header-top">
          <span class="pipeline__stage-name">{{ stage.stage }}</span>
          <span class="pipeline__count">{{ stage.count }}</span>
        </div>
        <span class="pipeline__total">{{ currencyShort(stage.totalValue) }}</span>
      </div>

      <draggable
        v-model="stage.deals"
        :group="'pipeline'"
        item-key="id"
        class="pipeline__cards"
        ghost-class="pipeline__ghost"
        @change="onDragChange(stage, $event)"
      >
        <template #item="{ element }">
          <DealCard :deal="element" />
        </template>
        <template #footer>
          <div v-if="stage.deals.length === 0" class="pipeline__empty">No deals</div>
        </template>
      </draggable>
    </div>
  </div>

  <DealFormDialog v-model="showForm" :deal="null" @saved="onFormSaved" />
</template>

<style lang="scss" scoped>
.view-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  &__active {
    background: rgba(2, 121, 95, 0.08) !important;
    color: var(--sr-primary) !important;
  }
}

.pipeline {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: calc(100vh - 200px);

  &__column {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
  }

  &__header {
    background: white;
    border-radius: 8px 8px 0 0;
    padding: 12px 16px;
    border-top: 3px solid;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

    &-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
  }

  &__stage-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--sr-text);
  }

  &__count {
    font-size: 12px;
    font-weight: 600;
    background: #f3f4f6;
    color: #6b7280;
    padding: 1px 8px;
    border-radius: 10px;
  }

  &__total {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
  }

  &__cards {
    flex: 1;
    background: #f9fafb;
    border-radius: 0 0 8px 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 100px;
  }

  &__ghost {
    opacity: 0.4;
  }

  &__empty {
    text-align: center;
    color: #d1d5db;
    font-size: 13px;
    padding: 24px 0;
  }
}
</style>
