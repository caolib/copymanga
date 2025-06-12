import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/HomeView.vue')
    },
    {
        path: '/books',
        name: 'BookHome',
        component: () => import('../views/BookHomeView.vue')
    },
    {
        path: '/posts',
        name: 'PostHome',
        component: () => import('../views/PostHomeView.vue')
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
        path: '/topics',
        name: 'Topics',
        component: () => import('../views/TopicsView.vue')
    },
    {
        path: '/topic/:pathWord',
        name: 'TopicDetail',
        component: () => import('../views/TopicDetailView.vue')
    },
    {
        path: '/search',
        name: 'Search',
        component: () => import('../views/SearchView.vue')
    },
    {
        path: '/bookshelf',
        name: 'Bookshelf',
        component: () => import('../views/BookshelfView.vue'),
        meta: { requiresAuth: true }
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
        path: '/author/:authorPathWord',
        name: 'AuthorMangaList',
        component: () => import('../views/AuthorMangaListView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/manga/:pathWord/chapter/:chapterId',
        name: 'ChapterReader',
        component: () => import('../views/ChapterReaderView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/book/:pathWord',
        name: 'BookDetail',
        component: () => import('../views/BookDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/book/:pathWord/volume/:volumeId',
        name: 'BookVolumeChapters',
        component: () => import('../views/BookVolumeChaptersView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/book/:pathWord/volume/:volumeId/reader',
        name: 'BookTextReader',
        component: () => import('../views/BookTextReaderView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/post/:postId',
        name: 'PostDetail',
        component: () => import('../views/PostDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/post/:postId/reader/:chapterId',
        name: 'PostReader',
        component: () => import('../views/PostReaderView.vue'),
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