<script setup lang="ts">
import type { Deal } from '@/core/models/deal'
import { formatDate } from '@/shared/utils/formatDate'

defineProps<{
  deal: Deal
}>()
</script>

<template>
  <router-link :to="{ name: 'deal-detail', params: { id: deal.id } }" class="deal-card">
    <div class="deal-card__header">
      <span class="deal-card__title">{{ deal.title }}</span>
      <span class="deal-card__value">${{ deal.value.toLocaleString() }}</span>
    </div>
    <div class="deal-card__contact">
      <v-icon size="14">mdi-account</v-icon>
      <span>{{ deal.contactName }}</span>
    </div>
    <div v-if="deal.companyName" class="deal-card__company">
      <v-icon size="14">mdi-domain</v-icon>
      <span>{{ deal.companyName }}</span>
    </div>
    <div v-if="deal.expectedCloseDate" class="deal-card__date">
      <v-icon size="14">mdi-calendar</v-icon>
      <span>{{ formatDate(deal.expectedCloseDate) }}</span>
    </div>
  </router-link>
</template>

<style lang="scss" scoped>
.deal-card {
  display: block;
  background: white;
  border: 1px solid var(--sr-border);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: var(--sr-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--sr-text);
    line-height: 1.3;
  }

  &__value {
    font-size: 13px;
    font-weight: 700;
    color: var(--sr-primary);
    white-space: nowrap;
  }

  &__contact,
  &__company,
  &__date {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
  }
}
</style>
