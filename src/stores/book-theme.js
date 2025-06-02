import { defineStore } from 'pinia'
import { getBookThemes } from '../api/book'

export const useBookThemeStore = defineStore('bookTheme', {
    state: () => ({
        themes: [],
        topTags: [],
        ordering: [],
        lastUpdateTime: null,
        isLoading: false,
        error: ''
    }),

    getters: {
        // 检查是否有缓存
        hasCache: (state) => {
            return state.themes.length > 0 && state.lastUpdateTime
        },

        // 检查缓存是否过期（7天）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const sevenDays = 7 * 24 * 60 * 60 * 1000
            return now - state.lastUpdateTime > sevenDays
        }
    },

    actions: {
        /**
         * 获取书籍主题数据
         * @param {boolean} forceRefresh 是否强制刷新
         */
        async fetchThemes(forceRefresh = false) {
            // 如果有缓存且未过期且不是强制刷新，直接返回
            if (this.hasCache && !this.isCacheExpired && !forceRefresh) {
                return Promise.resolve({ success: true, fromCache: true })
            }

            this.isLoading = true
            this.error = ''

            return getBookThemes()
                .then(response => {
                    if (response && response.code === 200 && response.results) {
                        this.themes = response.results.theme || []
                        this.topTags = response.results.top || []
                        this.ordering = response.results.ordering || []
                        this.lastUpdateTime = Date.now()
                        return { success: true, fromCache: false }
                    }
                    return { success: false, fromCache: false }
                })
                .catch(error => {
                    console.error('获取书籍主题失败:', error)
                    this.error = error.message || '获取书籍主题失败'
                    return { success: false, error, fromCache: false }
                })
                .finally(() => {
                    this.isLoading = false
                })
        },

        /**
         * 清除缓存
         */
        clearCache() {
            this.themes = []
            this.topTags = []
            this.ordering = []
            this.lastUpdateTime = null
            this.error = ''
        }
    },

    // 持久化配置
    persist: {
        key: 'copymanga-book-theme',
        storage: localStorage,
        paths: ['themes', 'topTags', 'ordering', 'lastUpdateTime']
    }
})
