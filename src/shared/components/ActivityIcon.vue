<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: string
}>()

const ICON_MAP: Record<string, { icon: string; color: string }> = {
  Note: { icon: 'mdi-text', color: '#6b7280' },
  Call: { icon: 'mdi-phone', color: '#3b82f6' },
  Email: { icon: 'mdi-email', color: '#f9a66c' },
  Meeting: { icon: 'mdi-account-group', color: '#02795f' },
  Task: { icon: 'mdi-check-circle', color: '#f76c6c' },
}

const config = computed(() => ICON_MAP[props.type] ?? { icon: 'mdi-calendar', color: '#6b7280' })
</script>

<template>
  <v-icon size="20" :style="{ color: config.color }">{{ config.icon }}</v-icon>
</template>
