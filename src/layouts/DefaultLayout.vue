<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { initials } from '@/shared/utils/initials'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const drawer = ref(window.innerWidth > 768)
const isMobile = ref(window.innerWidth <= 768)

window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) drawer.value = true
})

// Auto-close drawer on mobile navigation
watch(
  () => route.path,
  () => {
    if (isMobile.value) drawer.value = false
  },
)

const user = computed(() => authStore.user)
const isAdmin = computed(() => authStore.isAdmin)

interface NavItem {
  label: string
  icon: string
  route: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'mdi-view-dashboard', route: '/dashboard' },
  { label: 'Contacts', icon: 'mdi-account-group', route: '/contacts' },
  { label: 'Companies', icon: 'mdi-domain', route: '/companies' },
  { label: 'Deals', icon: 'mdi-handshake', route: '/deals' },
  { label: 'Activities', icon: 'mdi-calendar-text', route: '/activities' },
  { label: 'AI Assistant', icon: 'mdi-auto-fix', route: '/ai' },
  { label: 'Settings', icon: 'mdi-cog', route: '/settings' },
  { label: 'Users', icon: 'mdi-shield-account', route: '/admin', adminOnly: true },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => !item.adminOnly || isAdmin.value),
)

function logout() {
  authStore.logout()
  router.push('/auth/login')
}
</script>

<template>
  <v-navigation-drawer v-model="drawer" :temporary="isMobile" width="260" class="sidebar">
    <div class="sidebar__header">
      <div class="sidebar__logo">
        <span class="sidebar__logo-icon sr-gradient-bg">S</span>
        <span class="sidebar__logo-text"
          >Sunroom <span class="sr-gradient-text">CRM</span></span
        >
      </div>
    </div>

    <div class="sidebar__gradient-line"></div>

    <v-list nav density="compact" class="sidebar__nav">
      <v-list-item
        v-for="item in visibleNavItems"
        :key="item.route"
        :to="item.route"
        :prepend-icon="item.icon"
        :title="item.label"
        rounded="lg"
        color="primary"
      />
    </v-list>

    <template #append>
      <div v-if="user" class="sidebar__footer">
        <div class="sidebar__user">
          <div class="sidebar__avatar">{{ initials(user.name) }}</div>
          <div class="sidebar__user-info">
            <span class="sidebar__user-name">{{ user.name }}</span>
            <span class="sidebar__user-role">{{ user.role }}</span>
          </div>
          <v-btn icon="mdi-logout" variant="text" size="small" @click="logout" />
        </div>
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar flat border>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
  </v-app-bar>

  <v-main>
    <div class="layout-content">
      <router-view />
    </div>
  </v-main>
</template>

<style lang="scss" scoped>
.sidebar {
  &__header {
    display: flex;
    align-items: center;
    padding: 16px;
    min-height: 64px;
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__logo-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
    font-size: 18px;
    flex-shrink: 0;
  }

  &__logo-text {
    font-size: 20px;
    font-weight: 700;
    color: var(--sr-text);
    white-space: nowrap;
  }

  &__gradient-line {
    height: 3px;
    background: var(--sr-gradient);
    margin: 0 16px 8px;
    border-radius: 2px;
  }

  &__nav {
    flex: 1;
    padding: 0 8px;
  }

  &__footer {
    padding: 12px;
    border-top: 1px solid var(--sr-border);
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sr-primary);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
  }

  &__user-info {
    flex: 1;
    overflow: hidden;
    min-width: 0;
  }

  &__user-name {
    display: block;
    font-weight: 600;
    font-size: 13px;
    color: var(--sr-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__user-role {
    display: block;
    font-size: 11px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.layout-content {
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .layout-content {
    padding: 16px;
  }
}
</style>
