import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/HomeView.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/LoginView.vue')
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue')
    },
    {
        path: '/my-collection',
        name: 'MyCollection',
        component: () => import('../views/MyCollectionView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'UserProfile',
        component: () => import('../views/UserProfileView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/manga/:pathWord',
        name: 'MangaDetail',
        component: () => import('../views/MangaDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/manga/:pathWord/chapter/:chapterId',
        name: 'ChapterReader',
        component: () => import('../views/ChapterReaderView.vue'),
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !isLoggedIn()) {
        next('/login')
    } else {
        next()
    }
})

export default router