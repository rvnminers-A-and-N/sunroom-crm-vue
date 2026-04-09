<script setup lang="ts">
import { ref } from 'vue'
import { useAiStore } from '@/stores/ai.store'
import PageHeader from '@/shared/components/PageHeader.vue'
import ActivityIcon from '@/shared/components/ActivityIcon.vue'

const aiStore = useAiStore()

const tab = ref(0)
const searchQuery = ref('')
const summarizeText = ref('')

function onSearch() {
  if (!searchQuery.value.trim()) return
  aiStore.smartSearch(searchQuery.value)
}

function onSummarize() {
  if (!summarizeText.value.trim()) return
  aiStore.summarize(summarizeText.value)
}
</script>

<template>
  <PageHeader title="AI Assistant" subtitle="Smart search and text summarization powered by AI" />

  <v-tabs v-model="tab" color="primary">
    <v-tab :value="0">Smart Search</v-tab>
    <v-tab :value="1">Summarize</v-tab>
  </v-tabs>

  <v-tabs-window v-model="tab">
    <!-- Smart Search -->
    <v-tabs-window-item :value="0">
      <div class="ai-section">
        <v-card>
          <v-card-text>
            <p class="ai-section__desc">
              Ask natural language questions about your contacts and activities.
            </p>
            <div class="ai-section__input-row">
              <v-text-field
                v-model="searchQuery"
                label="Ask a question..."
                prepend-inner-icon="mdi-auto-fix"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="e.g. Who did I talk to last week?"
                class="ai-section__input"
                @keydown.enter="onSearch"
              />
              <v-btn
                color="primary"
                :loading="aiStore.searching"
                :disabled="!searchQuery.trim()"
                @click="onSearch"
              >
                Search
              </v-btn>
            </div>

            <div v-if="aiStore.searchResult" class="search-results">
              <div v-if="aiStore.searchResult.interpretation" class="search-results__interpretation">
                <v-icon size="20" color="primary">mdi-brain</v-icon>
                <span>{{ aiStore.searchResult.interpretation }}</span>
              </div>

              <template v-if="aiStore.searchResult.contacts.length > 0">
                <h4>Contacts ({{ aiStore.searchResult.contacts.length }})</h4>
                <div class="search-results__list">
                  <router-link
                    v-for="c in aiStore.searchResult.contacts"
                    :key="c.id"
                    :to="{ name: 'contact-detail', params: { id: c.id } }"
                    class="search-results__item"
                  >
                    <v-icon size="18" color="grey">mdi-account</v-icon>
                    <span>{{ c.firstName }} {{ c.lastName }}</span>
                    <span v-if="c.companyName" class="search-results__meta">{{ c.companyName }}</span>
                  </router-link>
                </div>
              </template>

              <template v-if="aiStore.searchResult.activities.length > 0">
                <h4>Activities ({{ aiStore.searchResult.activities.length }})</h4>
                <div class="search-results__list">
                  <div
                    v-for="a in aiStore.searchResult.activities"
                    :key="a.id"
                    class="search-results__item"
                  >
                    <ActivityIcon :type="a.type" />
                    <span>{{ a.subject }}</span>
                    <span class="search-results__meta">{{ a.type }}</span>
                  </div>
                </div>
              </template>

              <p
                v-if="aiStore.searchResult.contacts.length === 0 && aiStore.searchResult.activities.length === 0"
                class="search-results__empty"
              >
                No results found. Try rephrasing your question.
              </p>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-tabs-window-item>

    <!-- Summarize -->
    <v-tabs-window-item :value="1">
      <div class="ai-section">
        <v-card>
          <v-card-text>
            <p class="ai-section__desc">
              Paste meeting notes, emails, or any text to get a concise summary.
            </p>
            <v-textarea
              v-model="summarizeText"
              label="Paste text to summarize..."
              variant="outlined"
              rows="6"
              placeholder="Paste your meeting notes, email thread, or any text here..."
            />
            <div class="ai-section__action">
              <v-btn
                color="primary"
                :loading="aiStore.summarizing"
                :disabled="!summarizeText.trim()"
                @click="onSummarize"
              >
                Summarize
              </v-btn>
            </div>

            <div v-if="aiStore.summaryResult" class="summary-result">
              <h4>
                <v-icon size="18" color="primary">mdi-auto-fix</v-icon>
                Summary
              </h4>
              <p>{{ aiStore.summaryResult }}</p>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-tabs-window-item>
  </v-tabs-window>
</template>

<style lang="scss" scoped>
.ai-section {
  padding: 24px 0;

  &__desc {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 20px;
  }

  &__input-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  &__input {
    flex: 1;
  }

  &__action {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
}

.search-results {
  margin-top: 24px;
  border-top: 1px solid var(--sr-border);
  padding-top: 20px;

  &__interpretation {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #f0fdf4;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 14px;
    color: var(--sr-text);
  }

  h4 {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 16px 0 8px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    color: var(--sr-text);
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
      background: #f9fafb;
    }
  }

  &__meta {
    font-size: 12px;
    color: #9ca3af;
    margin-left: auto;
  }

  &__empty {
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    padding: 24px 0;
  }
}

.summary-result {
  margin-top: 24px;
  background: #f0fdf4;
  border-radius: 8px;
  border-left: 3px solid var(--sr-primary);
  padding: 16px 20px;

  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--sr-primary);
    margin: 0 0 10px;
  }

  p {
    font-size: 14px;
    color: var(--sr-text);
    margin: 0;
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

@media (max-width: 600px) {
  .ai-section__input-row {
    flex-direction: column;
  }
}
</style>
