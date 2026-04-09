<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCompanyStore } from '@/stores/company.store'
import { formatDate } from '@/shared/utils/formatDate'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import CompanyFormDialog from './CompanyFormDialog.vue'

const route = useRoute()
const router = useRouter()
const companyStore = useCompanyStore()
const c = computed(() => companyStore.company)

const showForm = ref(false)
const showDeleteConfirm = ref(false)

onMounted(() => {
  companyStore.fetchCompany(Number(route.params.id))
})

function openEdit() {
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  companyStore.fetchCompany(Number(route.params.id))
}

async function onDelete() {
  if (!c.value) return
  await companyStore.deleteCompany(c.value.id)
  router.push({ name: 'companies' })
}
</script>

<template>
  <template v-if="c">
    <div class="company-detail">
      <div class="company-detail__header">
        <v-btn icon="mdi-arrow-left" variant="text" @click="router.push({ name: 'companies' })" />
        <div class="company-detail__title">
          <h1>{{ c.name }}</h1>
          <span v-if="c.industry" class="company-detail__industry">{{ c.industry }}</span>
        </div>
        <div class="company-detail__actions">
          <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="openEdit">Edit</v-btn>
          <v-btn variant="outlined" color="error" prepend-icon="mdi-delete" @click="showDeleteConfirm = true">
            Delete
          </v-btn>
        </div>
      </div>

      <div class="company-detail__body">
        <v-card class="company-detail__info">
          <v-card-text>
            <div class="info-grid">
              <div v-if="c.website" class="info-item">
                <v-icon size="18">mdi-web</v-icon>
                <a :href="c.website" target="_blank" rel="noopener">{{ c.website }}</a>
              </div>
              <div v-if="c.phone" class="info-item">
                <v-icon size="18">mdi-phone</v-icon>
                <span>{{ c.phone }}</span>
              </div>
              <div v-if="c.address || c.city || c.state" class="info-item">
                <v-icon size="18">mdi-map-marker</v-icon>
                <span>
                  <template v-if="c.address">{{ c.address }}<br /></template>
                  {{ c.city }}{{ c.city && c.state ? ', ' : '' }}{{ c.state }} {{ c.zip }}
                </span>
              </div>
              <div class="info-item">
                <v-icon size="18">mdi-calendar</v-icon>
                <span>Added {{ formatDate(c.createdAt) }}</span>
              </div>
            </div>
            <div v-if="c.notes" class="company-detail__notes">
              <h4>Notes</h4>
              <p>{{ c.notes }}</p>
            </div>
          </v-card-text>
        </v-card>

        <div class="company-detail__tables">
          <v-card class="table-section">
            <v-card-text>
              <h3>Contacts ({{ c.contacts.length }})</h3>
              <v-table v-if="c.contacts.length > 0" density="comfortable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ct in c.contacts" :key="ct.id">
                    <td>
                      <router-link :to="{ name: 'contact-detail', params: { id: ct.id } }" class="table-link">
                        {{ ct.firstName }} {{ ct.lastName }}
                      </router-link>
                    </td>
                    <td>{{ ct.email || '—' }}</td>
                    <td>{{ ct.title || '—' }}</td>
                  </tr>
                </tbody>
              </v-table>
              <p v-else class="table-empty">No contacts at this company</p>
            </v-card-text>
          </v-card>

          <v-card class="table-section">
            <v-card-text>
              <h3>Deals ({{ c.deals.length }})</h3>
              <v-table v-if="c.deals.length > 0" density="comfortable">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Value</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in c.deals" :key="d.id">
                    <td>
                      <router-link :to="{ name: 'deal-detail', params: { id: d.id } }" class="table-link">
                        {{ d.title }}
                      </router-link>
                    </td>
                    <td>${{ d.value.toLocaleString() }}</td>
                    <td><span class="stage-badge">{{ d.stage }}</span></td>
                  </tr>
                </tbody>
              </v-table>
              <p v-else class="table-empty">No deals with this company</p>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <CompanyFormDialog v-model="showForm" :company="c" @saved="onFormSaved" />

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Company"
      :message="`Are you sure you want to delete ${c.name}? This will not delete associated contacts.`"
      @confirm="onDelete"
    />
  </template>

  <p v-else-if="companyStore.loading" style="text-align: center; color: #9ca3af; padding: 48px">
    Loading company...
  </p>
</template>

<style lang="scss" scoped>
.company-detail {
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__title {
    flex: 1;

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      color: var(--sr-text);
    }
  }

  &__industry {
    display: inline-block;
    font-size: 13px;
    font-weight: 500;
    padding: 2px 10px;
    border-radius: 10px;
    background: rgba(2, 121, 95, 0.1);
    color: var(--sr-primary);
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__body {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 24px;
    align-items: start;
  }

  &__notes {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;

    h4 {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    p {
      font-size: 14px;
      color: var(--sr-text);
      margin: 0;
      white-space: pre-wrap;
    }
  }

  &__tables {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: var(--sr-text);

  a {
    color: var(--sr-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.table-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--sr-text);
}

.table-link {
  color: var(--sr-primary);
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.table-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 16px 0;
}

.stage-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(2, 121, 95, 0.1);
  color: var(--sr-primary);
}

@media (max-width: 1024px) {
  .company-detail__body {
    grid-template-columns: 1fr;
  }
}
</style>
