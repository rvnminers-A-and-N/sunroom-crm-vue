<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login({ email: email.value, password: password.value })
    router.push({ name: 'dashboard' })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <v-card class="auth-card" elevation="2">
      <div class="auth-header">
        <div class="auth-logo">S</div>
        <h1>Welcome back</h1>
        <p>Sign in to your Sunroom CRM account</p>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
        {{ error }}
      </v-alert>

      <v-form @submit.prevent="onSubmit">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          variant="outlined"
          density="comfortable"
          :rules="[(v: string) => !!v || 'Email is required', (v: string) => /.+@.+\..+/.test(v) || 'Enter a valid email']"
          class="mb-1"
        />

        <v-text-field
          v-model="password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          variant="outlined"
          density="comfortable"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="[(v: string) => !!v || 'Password is required']"
          class="mb-1"
          @click:append-inner="showPassword = !showPassword"
        />

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :loading="loading"
          :disabled="!email || !password"
        >
          Sign In
        </v-btn>
      </v-form>

      <div class="auth-footer">
        Don't have an account?
        <router-link :to="{ name: 'register' }">Create one</router-link>
      </div>
    </v-card>
  </div>
</template>

<style lang="scss" scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px 32px;
  border-radius: 16px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 22px;
    font-weight: 700;
    color: var(--sr-text);
    margin: 16px 0 4px;
  }

  p {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
}

.auth-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #02795f 0%, #03a97e 100%);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #6b7280;

  a {
    color: var(--sr-primary);
    font-weight: 600;
    text-decoration: none;
    margin-left: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
