<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useActivityStore } from '@/stores/activity.store'
import type { Activity, ActivityType } from '@/core/models/activity'
import type { Contact } from '@/core/models/contact'
import type { Deal } from '@/core/models/deal'
import apiClient from '@/core/api/client'
import type { PaginatedResponse } from '@/core/models/pagination'

const props = defineProps<{
  modelValue: boolean
  activity: Activity | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const activityStore = useActivityStore()
const isEdit = computed(() => !!props.activity)

const type = ref<ActivityType>('Note')
const subject = ref('')
const body = ref('')
const contactId = ref<number | null>(null)
const dealId = ref<number | null>(null)
const occurredAt = ref('')
const saving = ref(false)
const contacts = ref<Contact[]>([])
const deals = ref<Deal[]>([])

const types: ActivityType[] = ['Note', 'Call', 'Email', 'Meeting', 'Task']

onMounted(async () => {
  const [contactRes, dealRes] = await Promise.all([
    apiClient.get<PaginatedResponse<Contact>>('/contacts', { params: { perPage: 200 } }),
    apiClient.get<PaginatedResponse<Deal>>('/deals', { params: { perPage: 200 } }),
  ])
  contacts.value = contactRes.data.data
  deals.value = dealRes.data.data
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const a = props.activity
      type.value = (a?.type as ActivityType) ?? 'Note'
      subject.value = a?.subject ?? ''
      body.value = a?.body ?? ''
      contactId.value = a?.contactId ?? null
      dealId.value = a?.dealId ?? null
      occurredAt.value = a ? a.occurredAt.substring(0, 10) : new Date().toISOString().substring(0, 10)
    }
  },
)

async function onSubmit() {
  if (!subject.value) return
  saving.value = true
  try {
    const data = {
      type: type.value,
      subject: subject.value,
      body: body.value || undefined,
      contactId: contactId.value ?? undefined,
      dealId: dealId.value ?? undefined,
      occurredAt: occurredAt.value ? new Date(occurredAt.value).toISOString() : undefined,
    }
    if (isEdit.value && props.activity) {
      await activityStore.updateActivity(props.activity.id, data)
    } else {
      await activityStore.createActivity(data)
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
      <v-card-title>{{ isEdit ? 'Edit Activity' : 'Log Activity' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSubmit">
          <div class="form-row">
            <v-select
              v-model="type"
              :items="types"
              label="Type"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="occurredAt"
              label="Date"
              type="date"
              variant="outlined"
              density="compact"
            />
          </div>

          <v-text-field
            v-model="subject"
            label="Subject"
            variant="outlined"
            density="compact"
            :rules="[(v: string) => !!v || 'Required']"
          />

          <v-select
            v-model="contactId"
            :items="[{ title: 'None', value: null }, ...contacts.map((c) => ({ title: `${c.firstName} ${c.lastName}`, value: c.id }))]"
            label="Contact"
            variant="outlined"
            density="compact"
          />

          <v-select
            v-model="dealId"
            :items="[{ title: 'None', value: null }, ...deals.map((d) => ({ title: d.title, value: d.id }))]"
            label="Deal"
            variant="outlined"
            density="compact"
          />

          <v-textarea v-model="body" label="Body" variant="outlined" density="compact" rows="4" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="onSubmit">
          {{ isEdit ? 'Save' : 'Log' }}
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
