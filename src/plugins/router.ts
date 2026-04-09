import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/features/auth/LoginPage.vue'),
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/features/auth/RegisterPage.vue'),
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/features/dashboard/DashboardPage.vue'),
        },
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('@/features/contacts/ContactListPage.vue'),
        },
        {
          path: 'contacts/:id',
          name: 'contact-detail',
          component: () => import('@/features/contacts/ContactDetailPage.vue'),
        },
        {
          path: 'companies',
          name: 'companies',
          component: () => import('@/features/companies/CompanyListPage.vue'),
        },
        {
          path: 'companies/:id',
          name: 'company-detail',
          component: () => import('@/features/companies/CompanyDetailPage.vue'),
        },
        {
          path: 'deals',
          name: 'deals',
          component: () => import('@/features/deals/DealListPage.vue'),
        },
        {
          path: 'deals/pipeline',
          name: 'deal-pipeline',
          component: () => import('@/features/deals/DealPipelinePage.vue'),
        },
        {
          path: 'deals/:id',
          name: 'deal-detail',
          component: () => import('@/features/deals/DealDetailPage.vue'),
        },
        {
          path: 'activities',
          name: 'activities',
          component: () => import('@/features/activities/ActivityListPage.vue'),
        },
        {
          path: 'ai',
          name: 'ai',
          component: () => import('@/features/ai/AiPanelPage.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/features/settings/SettingsPage.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/features/admin/UserManagementPage.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (!authStore.isAuthenticated) {
      return { name: 'login' }
    }
    if (!authStore.user) {
      try {
        await authStore.loadCurrentUser()
      } catch {
        authStore.logout()
        return { name: 'login' }
      }
    }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'dashboard' }
  }
})

export default router
