<script setup lang="ts">
import { ref } from 'vue'
import { useAiStore } from '@/stores/ai.store'
import PageHeader from '@/shared/components/PageHeader.vue'

const aiStore = useAiStore()

const tab = ref(0)
const searchQuery = ref('')
const summarizeText = ref('')
const dealIdInput = ref('')

function onSearch() {
  if (!searchQuery.value.trim()) return
  aiStore.smartSearch(searchQuery.value)
}

function onSummarize() {
  if (!summarizeText.value.trim()) return
  aiStore.summarize(summarizeText.value)
}

function onGenerateInsights() {
  const id = parseInt(dealIdInput.value, 10)
  if (isNaN(id) || id <= 0) return
  aiStore.dealInsights(id)
}

/* c8 ignore next -- Vuetify v-tabs-window v-model setter never fires in jsdom */
function onTabUpdate(v: number) { tab.value = v }
/* c8 ignore next -- Vuetify v-textarea v-model setter never fires in jsdom */
function onSummarizeTextUpdate(v: string) { summarizeText.value = v }
</script>

<template>
  <PageHeader title="AI Assistant" subtitle="Smart search and text summarization powered by AI" />

  <v-tabs v-model="tab" color="primary">
    <v-tab :value="0">Smart Search</v-tab>
    <v-tab :value="1">Summarize</v-tab>
    <v-tab :value="2">Deal Insights</v-tab>
  </v-tabs>

  <v-tabs-window :model-value="tab" @update:model-value="onTabUpdate">
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

            <div v-if="aiStore.searchResult || aiStore.searching" class="summary-result">
              <h4>
                <v-icon size="18" color="primary">mdi-brain</v-icon>
                Results
                <v-progress-circular v-if="aiStore.searching" indeterminate size="14" width="2" class="ml-2" />
              </h4>
              <p>{{ aiStore.searchResult }}<span v-if="aiStore.searching" class="typing-cursor" /></p>
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
              :model-value="summarizeText"
              @update:model-value="onSummarizeTextUpdate"
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

            <div v-if="aiStore.summaryResult || aiStore.summarizing" class="summary-result">
              <h4>
                <v-icon size="18" color="primary">mdi-auto-fix</v-icon>
                Summary
                <v-progress-circular v-if="aiStore.summarizing" indeterminate size="14" width="2" class="ml-2" />
              </h4>
              <p>{{ aiStore.summaryResult }}<span v-if="aiStore.summarizing" class="typing-cursor" /></p>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-tabs-window-item>

    <!-- Deal Insights -->
    <v-tabs-window-item :value="2">
      <div class="ai-section">
        <v-card>
          <v-card-text>
            <p class="ai-section__desc">
              Enter a deal ID to generate AI-powered insights and recommendations.
            </p>
            <div class="ai-section__input-row">
              <v-text-field
                v-model="dealIdInput"
                label="Deal ID"
                prepend-inner-icon="mdi-trending-up"
                variant="outlined"
                density="compact"
                hide-details
                type="number"
                placeholder="Enter deal ID..."
                class="ai-section__input"
                @keydown.enter="onGenerateInsights"
              />
              <v-btn
                color="primary"
                :loading="aiStore.generatingInsights"
                :disabled="!dealIdInput.trim() || isNaN(parseInt(dealIdInput, 10)) || parseInt(dealIdInput, 10) <= 0"
                @click="onGenerateInsights"
              >
                Generate Insights
              </v-btn>
            </div>

            <div v-if="aiStore.insightsResult || aiStore.generatingInsights" class="summary-result">
              <h4>
                <v-icon size="18" color="primary">mdi-trending-up</v-icon>
                Insights
                <v-progress-circular v-if="aiStore.generatingInsights" indeterminate size="14" width="2" class="ml-2" />
              </h4>
              <p>{{ aiStore.insightsResult }}<span v-if="aiStore.generatingInsights" class="typing-cursor" /></p>
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

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--sr-primary);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

@media (max-width: 600px) {
  .ai-section__input-row {
    flex-direction: column;
  }
}
</style>
