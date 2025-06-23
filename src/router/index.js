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
        component: () => import('../views/BookTabView.vue')
    },
    {
        path: '/posts',
        name: 'PostHome',
        component: () => import('../views/PostHomeView.vue')
    },
    {
        path: '/cartoons',
        name: 'CartoonHome',
        component: () => import('../views/CartoonHomeView.vue')
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
        path: '/downloads',
        name: 'Downloads',
        component: () => import('../views/DownloadsView.vue')
    },
    {
        path: '/localmanga/:uuid',
        name: 'LocalMangaDetail',
        component: () => import('../views/LocalMangaDetailView.vue')
    },
    {
        path: '/localcartoon/:uuid',
        name: 'LocalCartoonDetail',
        component: () => import('../views/LocalCartoonDetailView.vue')
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
        path: '/cartoon/:pathWord',
        name: 'CartoonDetail',
        component: () => import('../views/CartoonDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/cartoon/:pathWord/player/:chapterId',
        name: 'CartoonPlayer',
        component: () => import('../views/CartoonPlayerView.vue'),
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