<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTagStore } from '@/stores/tag.store'
import type { Tag } from '@/core/models/tag'
import { initials } from '@/shared/utils/initials'
import { formatDate } from '@/shared/utils/formatDate'
import PageHeader from '@/shared/components/PageHeader.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const authStore = useAuthStore()
const tagStore = useTagStore()

const newTagName = ref('')
const newTagColor = ref('#02795F')
const editingTag = ref<Tag | null>(null)
const editName = ref('')
const editColor = ref('')
const showDeleteConfirm = ref(false)
const deletingTag = ref<Tag | null>(null)

onMounted(() => {
  tagStore.fetchTags()
})

async function createTag() {
  if (!newTagName.value.trim()) return
  await tagStore.createTag({ name: newTagName.value.trim(), color: newTagColor.value })
  newTagName.value = ''
  newTagColor.value = '#02795F'
}

function startEdit(tag: Tag) {
  editingTag.value = tag
  editName.value = tag.name
  editColor.value = tag.color
}

function cancelEdit() {
  editingTag.value = null
}

async function saveEdit() {
  if (!editingTag.value || !editName.value.trim()) return
  await tagStore.updateTag(editingTag.value.id, {
    name: editName.value.trim(),
    color: editColor.value,
  })
  editingTag.value = null
}

function confirmDelete(tag: Tag) {
  deletingTag.value = tag
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingTag.value) return
  await tagStore.deleteTag(deletingTag.value.id)
}

const colorPresets = ['#02795F', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#059669', '#4f46e5']
</script>

<template>
  <PageHeader title="Settings" subtitle="Manage your profile and tags" />

  <div class="settings-grid">
    <!-- Profile Card -->
    <v-card class="settings-profile">
      <v-card-text>
        <div class="settings-profile__header">
          <v-avatar size="72" color="primary" class="settings-profile__avatar">
            <span class="text-h5 text-white">{{ initials(authStore.user?.name ?? '') }}</span>
          </v-avatar>
          <div class="settings-profile__info">
            <h3>{{ authStore.user?.name }}</h3>
            <p class="settings-profile__email">{{ authStore.user?.email }}</p>
            <v-chip size="small" :color="authStore.user?.role === 'Admin' ? 'primary' : 'default'">
              {{ authStore.user?.role }}
            </v-chip>
          </div>
        </div>

        <v-divider class="my-4" />

        <div class="settings-profile__detail">
          <v-icon size="18" color="grey">mdi-calendar</v-icon>
          <span>Joined {{ formatDate(authStore.user?.createdAt) }}</span>
        </div>
        <div class="settings-profile__detail">
          <v-icon size="18" color="grey">mdi-email-outline</v-icon>
          <span>{{ authStore.user?.email }}</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Tags Management -->
    <v-card class="settings-tags">
      <v-card-title>Tags</v-card-title>
      <v-card-subtitle>Create and manage tags for organizing contacts</v-card-subtitle>
      <v-card-text>
        <!-- Create Tag -->
        <div class="tag-create">
          <v-text-field
            v-model="newTagName"
            label="New tag name"
            variant="outlined"
            density="compact"
            hide-details
            class="tag-create__input"
            @keydown.enter="createTag"
          />
          <input v-model="newTagColor" type="color" class="tag-create__color" :title="newTagColor" />
          <v-btn color="primary" variant="flat" size="small" :disabled="!newTagName.trim()" @click="createTag">
            Add
          </v-btn>
        </div>

        <!-- Color Presets -->
        <div class="color-presets">
          <button
            v-for="c in colorPresets"
            :key="c"
            class="color-presets__swatch"
            :class="{ 'color-presets__swatch--active': newTagColor === c }"
            :style="{ background: c }"
            @click="newTagColor = c"
          />
        </div>

        <v-divider class="my-4" />

        <!-- Tag List -->
        <div v-if="tagStore.tags.length === 0" class="text-center text-grey py-4">
          No tags yet. Create one above.
        </div>

        <div class="tag-list">
          <div v-for="tag in tagStore.tags" :key="tag.id" class="tag-list__item">
            <template v-if="editingTag?.id === tag.id">
              <v-text-field
                v-model="editName"
                variant="outlined"
                density="compact"
                hide-details
                class="tag-list__edit-input"
                @keydown.enter="saveEdit"
                @keydown.escape="cancelEdit"
              />
              <input v-model="editColor" type="color" class="tag-create__color" />
              <v-btn icon="mdi-check" variant="text" size="small" color="primary" @click="saveEdit" />
              <v-btn icon="mdi-close" variant="text" size="small" @click="cancelEdit" />
            </template>
            <template v-else>
              <v-chip :color="tag.color" size="small" label>
                {{ tag.name }}
              </v-chip>
              <span class="tag-list__color-label">{{ tag.color }}</span>
              <v-spacer />
              <v-btn icon="mdi-pencil" variant="text" size="x-small" @click="startEdit(tag)" />
              <v-btn icon="mdi-delete" variant="text" size="x-small" @click="confirmDelete(tag)" />
            </template>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Tag"
    :message="`Are you sure you want to delete &quot;${deletingTag?.name}&quot;? This will remove it from all contacts.`"
    @confirm="onDelete"
  />
</template>

<style lang="scss" scoped>
.settings-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
}

.settings-profile {
  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__avatar {
    flex-shrink: 0;
  }

  &__info {
    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
  }

  &__email {
    font-size: 14px;
    color: #6b7280;
    margin: 2px 0 8px;
  }

  &__detail {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #6b7280;
    padding: 6px 0;
  }
}

.tag-create {
  display: flex;
  align-items: center;
  gap: 12px;

  &__input {
    flex: 1;
  }

  &__color {
    width: 36px;
    height: 36px;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    padding: 0;
    background: none;

    &::-webkit-color-swatch-wrapper {
      padding: 2px;
    }

    &::-webkit-color-swatch {
      border: none;
      border-radius: 3px;
    }
  }
}

.color-presets {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  &__swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      transform: scale(1.15);
    }

    &--active {
      border-color: var(--sr-text);
      box-shadow: 0 0 0 2px white, 0 0 0 4px var(--sr-text);
    }
  }
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background 0.15s ease;

    &:hover {
      background: #f9fafb;
    }
  }

  &__color-label {
    font-size: 12px;
    color: #9ca3af;
    font-family: monospace;
  }

  &__edit-input {
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
