<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDealStore } from '@/stores/deal.store'
import type { Deal, DealDetail, DealStage } from '@/core/models/deal'
import type { Contact } from '@/core/models/contact'
import type { Company } from '@/core/models/company'
import apiClient from '@/core/api/client'
import type { PaginatedResponse } from '@/core/models/pagination'

const props = defineProps<{
  modelValue: boolean
  deal: Deal | DealDetail | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const dealStore = useDealStore()
const isEdit = computed(() => !!props.deal)

const title = ref('')
const value = ref(0)
const contactId = ref<number>(0)
const companyId = ref<number | null>(null)
const stage = ref<DealStage>('Lead')
const expectedCloseDate = ref<string>('')
const notes = ref('')
const saving = ref(false)
const contacts = ref<Contact[]>([])
const companies = ref<Company[]>([])

const stages: DealStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

onMounted(async () => {
  const [contactRes, companyRes] = await Promise.all([
    apiClient.get<PaginatedResponse<Contact>>('/contacts', { params: { perPage: 200 } }),
    apiClient.get<PaginatedResponse<Company>>('/companies', { params: { perPage: 200 } }),
  ])
  contacts.value = contactRes.data.data
  companies.value = companyRes.data.data
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const d = props.deal
      title.value = d?.title ?? ''
      value.value = d?.value ?? 0
      contactId.value = d?.contactId ?? 0
      companyId.value = d?.companyId ?? null
      stage.value = (d?.stage as DealStage) ?? 'Lead'
      expectedCloseDate.value = d?.expectedCloseDate?.substring(0, 10) ?? ''
      notes.value = ''
    }
  },
)

async function onSubmit() {
  if (!title.value || !contactId.value) return
  saving.value = true
  try {
    const data = {
      title: title.value,
      value: value.value,
      contactId: contactId.value,
      companyId: companyId.value ?? undefined,
      stage: stage.value,
      expectedCloseDate: expectedCloseDate.value || undefined,
      notes: notes.value || undefined,
    }
    if (isEdit.value && props.deal) {
      await dealStore.updateDeal(props.deal.id, data)
    } else {
      await dealStore.createDeal(data)
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
      <v-card-title>{{ isEdit ? 'Edit Deal' : 'New Deal' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSubmit">
          <v-text-field
            v-model="title"
            label="Title"
            variant="outlined"
            density="compact"
            :rules="[(v: string) => !!v || 'Required']"
          />

          <div class="form-row">
            <v-text-field
              v-model.number="value"
              label="Value ($)"
              type="number"
              variant="outlined"
              density="compact"
              :rules="[(v: number) => v >= 0 || 'Must be positive']"
            />
            <v-select
              v-model="stage"
              :items="stages"
              label="Stage"
              variant="outlined"
              density="compact"
            />
          </div>

          <v-select
            v-model="contactId"
            :items="contacts.map((c) => ({ title: `${c.firstName} ${c.lastName}`, value: c.id }))"
            label="Contact"
            variant="outlined"
            density="compact"
            :rules="[(v: number) => !!v || 'Required']"
          />

          <v-select
            v-model="companyId"
            :items="[{ title: 'None', value: null }, ...companies.map((c) => ({ title: c.name, value: c.id }))]"
            label="Company"
            variant="outlined"
            density="compact"
          />

          <v-text-field
            v-model="expectedCloseDate"
            label="Expected Close Date"
            type="date"
            variant="outlined"
            density="compact"
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
