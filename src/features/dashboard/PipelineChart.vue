<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import type { DealStageCount } from '@/core/models/dashboard'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{
  stages: DealStageCount[]
}>()

const STAGE_COLORS: Record<string, string> = {
  Lead: '#F4C95D',
  Qualified: '#F9A66C',
  Proposal: '#F76C6C',
  Negotiation: '#3B82F6',
  Won: '#02795F',
  Lost: '#9CA3AF',
}

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.stages.map((s) => s.stage),
  datasets: [
    {
      label: 'Value',
      data: props.stages.map((s) => s.totalValue),
      backgroundColor: props.stages.map((s) => STAGE_COLORS[s.stage] ?? '#9CA3AF'),
      borderRadius: 6,
      barThickness: 32,
    },
  ],
}))

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `$${((ctx.parsed.y ?? 0) / 1000).toFixed(0)}K`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val) => `$${(Number(val) / 1000).toFixed(0)}K`,
      },
      grid: { color: '#f3f4f6' },
    },
    x: {
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div class="pipeline-chart sr-card">
    <h3 class="pipeline-chart__title">Pipeline by Stage</h3>
    <div class="pipeline-chart__canvas">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pipeline-chart {
  padding: 20px;

  &__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--sr-text);
  }

  &__canvas {
    height: 280px;
  }
}
</style>
