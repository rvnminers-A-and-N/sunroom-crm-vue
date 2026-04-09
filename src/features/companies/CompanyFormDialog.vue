<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCompanyStore } from '@/stores/company.store'
import type { Company, CompanyDetail } from '@/core/models/company'

const props = defineProps<{
  modelValue: boolean
  company: Company | CompanyDetail | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const companyStore = useCompanyStore()
const isEdit = computed(() => !!props.company)

const name = ref('')
const industry = ref('')
const website = ref('')
const phone = ref('')
const address = ref('')
const city = ref('')
const state = ref('')
const zip = ref('')
const notes = ref('')
const saving = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const c = props.company
      name.value = c?.name ?? ''
      industry.value = c?.industry ?? ''
      website.value = c?.website ?? ''
      phone.value = c?.phone ?? ''
      address.value = ''
      city.value = c?.city ?? ''
      state.value = c?.state ?? ''
      zip.value = ''
      notes.value = ''
    }
  },
)

async function onSubmit() {
  if (!name.value) return
  saving.value = true
  try {
    const data = {
      name: name.value,
      industry: industry.value || undefined,
      website: website.value || undefined,
      phone: phone.value || undefined,
      address: address.value || undefined,
      city: city.value || undefined,
      state: state.value || undefined,
      zip: zip.value || undefined,
      notes: notes.value || undefined,
    }
    if (isEdit.value && props.company) {
      await companyStore.updateCompany(props.company.id, data)
    } else {
      await companyStore.createCompany(data)
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
      <v-card-title>{{ isEdit ? 'Edit Company' : 'New Company' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSubmit">
          <v-text-field
            v-model="name"
            label="Company Name"
            variant="outlined"
            density="compact"
            :rules="[(v: string) => !!v || 'Required']"
          />
          <v-text-field v-model="industry" label="Industry" variant="outlined" density="compact" />
          <v-text-field v-model="website" label="Website" placeholder="https://..." variant="outlined" density="compact" />
          <v-text-field v-model="phone" label="Phone" variant="outlined" density="compact" />
          <v-text-field v-model="address" label="Address" variant="outlined" density="compact" />

          <div class="form-row">
            <v-text-field v-model="city" label="City" variant="outlined" density="compact" />
            <v-text-field v-model="state" label="State" variant="outlined" density="compact" class="form-row__short" />
            <v-text-field v-model="zip" label="ZIP" variant="outlined" density="compact" class="form-row__short" />
          </div>

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

  &__short {
    max-width: 120px;
  }
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;

    &__short {
      max-width: 100%;
    }
  }
}
</style>
