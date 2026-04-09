<script setup lang="ts">
import type { RecentActivity } from '@/core/models/dashboard'
import ActivityIcon from '@/shared/components/ActivityIcon.vue'
import { relativeTime } from '@/shared/utils/relativeTime'

defineProps<{
  activities: RecentActivity[]
}>()
</script>

<template>
  <div class="activity-list sr-card">
    <h3 class="activity-list__title">Recent Activity</h3>
    <template v-if="activities.length">
      <div v-for="activity in activities" :key="activity.id" class="activity-list__item">
        <ActivityIcon :type="activity.type" />
        <div class="activity-list__info">
          <span class="activity-list__subject">{{ activity.subject }}</span>
          <span class="activity-list__meta">
            {{ activity.userName }}
            <template v-if="activity.contactName"> &middot; {{ activity.contactName }}</template>
          </span>
        </div>
        <span class="activity-list__time">{{ relativeTime(activity.occurredAt) }}</span>
      </div>
    </template>
    <p v-else class="activity-list__empty">No recent activity</p>
  </div>
</template>

<style lang="scss" scoped>
.activity-list {
  padding: 20px;

  &__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--sr-text);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;

    &:last-child {
      border-bottom: none;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__subject {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--sr-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    display: block;
    font-size: 12px;
    color: #9ca3af;
  }

  &__time {
    font-size: 12px;
    color: #9ca3af;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__empty {
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    padding: 24px 0;
  }
}
</style>
