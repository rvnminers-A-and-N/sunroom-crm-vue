<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContactStore } from '@/stores/contact.store'
import { formatDate } from '@/shared/utils/formatDate'
import { relativeTime } from '@/shared/utils/relativeTime'
import TagChip from '@/shared/components/TagChip.vue'
import ActivityIcon from '@/shared/components/ActivityIcon.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import ContactFormDialog from './ContactFormDialog.vue'
import { ref, computed } from 'vue'

const route = useRoute()
const router = useRouter()
const contactStore = useContactStore()
const c = computed(() => contactStore.contact)

const showForm = ref(false)
const showDeleteConfirm = ref(false)
const tab = ref(0)

onMounted(() => {
  const id = Number(route.params.id)
  contactStore.fetchContact(id)
})

function openEdit() {
  showForm.value = true
}

function onFormSaved() {
  showForm.value = false
  contactStore.fetchContact(Number(route.params.id))
}

async function onDelete() {
  const c = contactStore.contact
  if (!c) return
  await contactStore.deleteContact(c.id)
  router.push({ name: 'contacts' })
}
</script>

<template>
  <template v-if="c">
    <div class="contact-detail">
      <div class="contact-detail__header">
        <v-btn icon="mdi-arrow-left" variant="text" @click="router.push({ name: 'contacts' })" />
        <div class="contact-detail__title">
          <h1>{{ c.firstName }} {{ c.lastName }}</h1>
          <span v-if="c.title" class="contact-detail__subtitle">{{ c.title }}</span>
          <span v-if="c.company" class="contact-detail__subtitle">
            at
            <router-link :to="{ name: 'company-detail', params: { id: c.company.id } }">{{
              c.company.name
            }}</router-link>
          </span>
        </div>
        <div class="contact-detail__actions">
          <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="openEdit">Edit</v-btn>
          <v-btn variant="outlined" color="error" prepend-icon="mdi-delete" @click="showDeleteConfirm = true">
            Delete
          </v-btn>
        </div>
      </div>

      <div class="contact-detail__body">
        <v-card class="contact-detail__info">
          <v-card-text>
            <div class="info-grid">
              <div class="info-item">
                <v-icon size="20">mdi-email</v-icon>
                <span>{{ c.email || 'No email' }}</span>
              </div>
              <div class="info-item">
                <v-icon size="20">mdi-phone</v-icon>
                <span>{{ c.phone || 'No phone' }}</span>
              </div>
              <div class="info-item">
                <v-icon size="20">mdi-calendar</v-icon>
                <span>Added {{ formatDate(c.createdAt) }}</span>
              </div>
              <div v-if="c.lastContactedAt" class="info-item">
                <v-icon size="20">mdi-clock-outline</v-icon>
                <span>Last contacted {{ relativeTime(c.lastContactedAt) }}</span>
              </div>
            </div>
            <div v-if="c.tags.length > 0" class="contact-detail__tags">
              <TagChip v-for="tag in c.tags" :key="tag.id" :tag="tag" />
            </div>
            <div v-if="c.notes" class="contact-detail__notes">
              <h4>Notes</h4>
              <p>{{ c.notes }}</p>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="contact-detail__tabs">
          <v-tabs v-model="tab" color="primary">
            <v-tab :value="0">Deals ({{ c.deals.length }})</v-tab>
            <v-tab :value="1">Activities ({{ c.activities.length }})</v-tab>
          </v-tabs>

          <v-tabs-window v-model="tab">
            <v-tabs-window-item :value="0">
              <div v-if="c.deals.length > 0" class="tab-content">
                <router-link
                  v-for="deal in c.deals"
                  :key="deal.id"
                  :to="{ name: 'deal-detail', params: { id: deal.id } }"
                  class="deal-item sr-card"
                >
                  <div class="deal-item__info">
                    <span class="deal-item__title">{{ deal.title }}</span>
                    <v-chip size="x-small" :data-stage="deal.stage">{{ deal.stage }}</v-chip>
                  </div>
                  <span class="deal-item__value">${{ deal.value.toLocaleString() }}</span>
                </router-link>
              </div>
              <p v-else class="tab-empty">No deals yet</p>
            </v-tabs-window-item>

            <v-tabs-window-item :value="1">
              <div v-if="c.activities.length > 0" class="tab-content">
                <div v-for="activity in c.activities" :key="activity.id" class="activity-item">
                  <ActivityIcon :type="activity.type" />
                  <div class="activity-item__info">
                    <span class="activity-item__subject">{{ activity.subject }}</span>
                    <span class="activity-item__meta">
                      {{ activity.type }} &middot; {{ relativeTime(activity.occurredAt) }}
                    </span>
                  </div>
                </div>
              </div>
              <p v-else class="tab-empty">No activities yet</p>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card>
      </div>
    </div>

    <ContactFormDialog v-model="showForm" :contact="c" @saved="onFormSaved" />

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Contact"
      :message="`Are you sure you want to delete ${c.firstName} ${c.lastName}?`"
      @confirm="onDelete"
    />
  </template>

  <div v-else-if="contactStore.loading" class="sr-loading">
    <v-progress-circular indeterminate color="primary" />
    <span>Loading contact...</span>
  </div>
</template>

<style lang="scss" scoped>
.contact-detail {
  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  &__title {
    flex: 1;

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--sr-text);
      margin: 0;
    }
  }

  &__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin-right: 8px;

    a {
      color: var(--sr-primary);
      text-decoration: none;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__body {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 16px;
  }

  &__tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  &__notes {
    margin-top: 16px;

    h4 {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      margin: 0 0 4px;
    }

    p {
      font-size: 14px;
      color: var(--sr-text);
      margin: 0;
      white-space: pre-wrap;
    }
  }
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--sr-text);
}

.tab-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 32px;
}

.deal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.15s;

  &:hover {
    background: #f9fafb;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--sr-text);
  }

  &__value {
    font-size: 14px;
    font-weight: 600;
    color: var(--sr-text);
  }
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__subject {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--sr-text);
  }

  &__meta {
    display: block;
    font-size: 12px;
    color: #9ca3af;
  }
}

@media (max-width: 1024px) {
  .contact-detail__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .contact-detail__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .contact-detail__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
