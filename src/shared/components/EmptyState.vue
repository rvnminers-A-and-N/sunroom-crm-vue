<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    message?: string
    actionLabel?: string
  }>(),
  {
    icon: 'mdi-inbox',
    title: 'No data',
    message: 'Nothing to show here yet.',
  },
)

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state">
    <v-icon size="48" color="grey-lighten-1">{{ icon }}</v-icon>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p class="empty-state__message">{{ message }}</p>
    <v-btn v-if="actionLabel" color="primary" @click="emit('action')">
      {{ actionLabel }}
    </v-btn>
  </div>
</template>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--sr-text);
    margin: 16px 0 8px;
  }

  &__message {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 24px;
    max-width: 400px;
  }
}
</style>
