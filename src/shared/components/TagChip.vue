<script setup lang="ts">
import type { Tag } from '@/core/models/tag'

defineProps<{
  tag: Tag
  removable?: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <v-chip size="small" :style="{ backgroundColor: tag.color + '20', color: tag.color }">
    {{ tag.name }}
    <template v-if="removable">
      <v-icon size="14" class="ml-1" @click.stop="emit('remove')"
        >mdi-close-circle</v-icon
      >
    </template>
  </v-chip>
</template>
