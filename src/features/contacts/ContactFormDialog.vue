<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useContactStore } from '@/stores/contact.store'
import { useTagStore } from '@/stores/tag.store'
import type { Contact } from '@/core/models/contact'
import type { Company } from '@/core/models/company'
import apiClient from '@/core/api/client'
import type { PaginatedResponse } from '@/core/models/pagination'

const props = defineProps<{
  modelValue: boolean
  contact: Contact | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const contactStore = useContactStore()
const tagStore = useTagStore()

const isEdit = computed(() => !!props.contact)

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const title = ref('')
const companyId = ref<number | null>(null)
const tagIds = ref<number[]>([])
const notes = ref('')
const saving = ref(false)
const companies = ref<Company[]>([])

onMounted(async () => {
  const res = await apiClient.get<PaginatedResponse<Company>>('/companies', { params: { perPage: 200 } })
  companies.value = res.data.data
  tagStore.fetchTags()
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const c = props.contact
      firstName.value = c?.firstName ?? ''
      lastName.value = c?.lastName ?? ''
      email.value = c?.email ?? ''
      phone.value = c?.phone ?? ''
      title.value = c?.title ?? ''
      companyId.value = c?.companyId ?? null
      tagIds.value = []
      notes.value = ''
    }
  },
)

async function onSubmit() {
  saving.value = true
  try {
    if (isEdit.value && props.contact) {
      await contactStore.updateContact(props.contact.id, {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value || undefined,
        phone: phone.value || undefined,
        title: title.value || undefined,
        notes: notes.value || undefined,
        companyId: companyId.value ?? undefined,
      })
    } else {
      await contactStore.createContact({
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value || undefined,
        phone: phone.value || undefined,
        title: title.value || undefined,
        notes: notes.value || undefined,
        companyId: companyId.value ?? undefined,
        tagIds: tagIds.value.length ? tagIds.value : undefined,
      })
    }
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>{{ isEdit ? 'Edit Contact' : 'New Contact' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSubmit">
          <div class="form-row">
            <v-text-field
              v-model="firstName"
              label="First Name"
              variant="outlined"
              density="compact"
              :rules="[(v: string) => !!v || 'Required']"
            />
            <v-text-field
              v-model="lastName"
              label="Last Name"
              variant="outlined"
              density="compact"
              :rules="[(v: string) => !!v || 'Required']"
            />
          </div>

          <v-text-field v-model="email" label="Email" type="email" variant="outlined" density="compact" />
          <v-text-field v-model="phone" label="Phone" variant="outlined" density="compact" />
          <v-text-field v-model="title" label="Title" variant="outlined" density="compact" />

          <v-select
            v-model="companyId"
            :items="[{ title: 'None', value: null }, ...companies.map((c) => ({ title: c.name, value: c.id }))]"
            label="Company"
            variant="outlined"
            density="compact"
          />

          <v-select
            v-if="!isEdit"
            v-model="tagIds"
            :items="tagStore.tags.map((t) => ({ title: t.name, value: t.id }))"
            label="Tags"
            variant="outlined"
            density="compact"
            multiple
            chips
          />

          <v-textarea v-model="notes" label="Notes" variant="outlined" density="compact" rows="3" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="onSubmit">
          {{ isEdit ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="scss" scoped>
.form-row {
  display: flex;
  gap: 16px;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
