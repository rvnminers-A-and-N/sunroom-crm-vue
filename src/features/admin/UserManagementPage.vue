<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useAdminStore } from '@/stores/admin.store'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/core/models/user'
import { initials } from '@/shared/utils/initials'
import { formatDate } from '@/shared/utils/formatDate'
import PageHeader from '@/shared/components/PageHeader.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'

const adminStore = useAdminStore()
const authStore = useAuthStore()

const showDeleteConfirm = ref(false)
const deletingUser = ref<User | null>(null)

const roles = ['User', 'Admin']

onMounted(() => {
  adminStore.fetchUsers()
})

async function onRoleChange(user: User, role: string) {
  await adminStore.updateUser(user.id, { role })
}

function confirmDelete(user: User) {
  deletingUser.value = user
  showDeleteConfirm.value = true
}

async function onDelete() {
  if (!deletingUser.value) return
  await adminStore.deleteUser(deletingUser.value.id)
}

const headers = [
  { title: 'User', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Role', key: 'role', sortable: false, width: 160 },
  { title: 'Joined', key: 'createdAt', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 60 },
]
</script>

<template>
  <PageHeader title="User Management" subtitle="Manage user accounts and roles" />

  <v-data-table
    :headers="headers"
    :items="adminStore.users"
    :loading="adminStore.loading"
    class="sr-card"
  >
    <template #item.name="{ item }">
      <div class="d-flex align-center ga-3">
        <v-avatar size="32" color="primary">
          <span class="text-caption text-white">{{ initials(item.name) }}</span>
        </v-avatar>
        <span class="font-weight-medium">{{ item.name }}</span>
        <v-chip v-if="item.id === authStore.user?.id" size="x-small" color="info" variant="tonal">
          You
        </v-chip>
      </div>
    </template>
    <template #item.role="{ item }">
      <v-select
        :model-value="item.role"
        :items="roles"
        variant="outlined"
        density="compact"
        hide-details
        :disabled="item.id === authStore.user?.id"
        @update:model-value="onRoleChange(item, $event)"
      />
    </template>
    <template #item.createdAt="{ item }">
      {{ formatDate(item.createdAt) }}
    </template>
    <template #item.actions="{ item }">
      <v-btn
        icon="mdi-delete"
        variant="text"
        size="small"
        :disabled="item.id === authStore.user?.id"
        @click="confirmDelete(item)"
      />
    </template>
  </v-data-table>

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete User"
    :message="`Are you sure you want to delete &quot;${deletingUser?.name}&quot;? This action cannot be undone.`"
    @confirm="onDelete"
  />
</template>
