<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard.store'
import { currencyShort } from '@/shared/utils/currencyShort'
import StatCard from '@/shared/components/StatCard.vue'
import PipelineChart from './PipelineChart.vue'
import RecentActivityList from './RecentActivityList.vue'

const store = useDashboardStore()

onMounted(() => {
  store.fetchDashboard()
})
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboard__title">Dashboard</h1>

    <template v-if="store.data">
      <div class="dashboard__stats">
        <router-link to="/contacts">
          <StatCard icon="mdi-account-group" label="Total Contacts" :value="store.data.totalContacts" />
        </router-link>
        <router-link to="/companies">
          <StatCard
            icon="mdi-domain"
            label="Total Companies"
            :value="store.data.totalCompanies"
            icon-bg="rgba(59, 130, 246, 0.1)"
            icon-color="#3B82F6"
          />
        </router-link>
        <router-link to="/deals">
          <StatCard
            icon="mdi-handshake"
            label="Active Deals"
            :value="store.data.totalDeals"
            icon-bg="rgba(249, 166, 108, 0.1)"
            icon-color="#F9A66C"
          />
        </router-link>
        <StatCard
          icon="mdi-trending-up"
          label="Pipeline Value"
          :value="currencyShort(store.data.totalPipelineValue)"
          icon-bg="rgba(244, 201, 93, 0.1)"
          icon-color="#F4C95D"
        />
        <StatCard
          icon="mdi-trophy"
          label="Won Revenue"
          :value="currencyShort(store.data.wonRevenue)"
          icon-bg="rgba(2, 121, 95, 0.1)"
          icon-color="#02795F"
        />
      </div>

      <div class="dashboard__grid">
        <PipelineChart :stages="store.data.dealsByStage" />
        <RecentActivityList :activities="store.data.recentActivities" />
      </div>
    </template>

    <p v-else-if="store.loading" class="dashboard__loading">Loading dashboard...</p>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  &__title {
    font-size: 24px;
    font-weight: 700;
    color: var(--sr-text);
    margin: 0 0 24px;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 24px;

    a {
      text-decoration: none;
      color: inherit;
      transition: transform 0.15s ease;

      &:hover {
        transform: translateY(-2px);
      }
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  &__loading {
    text-align: center;
    color: #9ca3af;
    padding: 48px 0;
  }
}

@media (max-width: 1024px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard__stats {
    grid-template-columns: 1fr;
  }
}
</style>
