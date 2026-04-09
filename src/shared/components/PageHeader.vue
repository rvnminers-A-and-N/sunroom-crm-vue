<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  actionLabel?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="page-header">
    <div>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <v-btn v-if="actionLabel" color="primary" prepend-icon="mdi-plus" @click="emit('action')">
      {{ actionLabel }}
    </v-btn>
  </div>
</template>

<style lang="scss" scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: var(--sr-text);
    margin: 0;
  }

  &__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 4px 0 0;
  }
}
</style>
