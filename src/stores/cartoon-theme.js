import { defineStore } from 'pinia'
import { getCartoonThemes } from '../api/cartoon'

export const useCartoonThemeStore = defineStore('cartoonTheme', {
    state: () => ({
        themes: [],
        lastUpdateTime: null,
        isLoading: false
    }),

    getters: {
        // 检查是否有缓存数据
        hasCache(state) {
            return state.themes.length > 0 && state.lastUpdateTime
        },

        // 检查缓存是否过期
        isCacheExpired(state) {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const sevenDays = 24 * 60 * 60 * 1000
            return now - state.lastUpdateTime > sevenDays
        }
    },

    actions: {
        async fetchThemes(forceRefresh = false) {
            // 如果有缓存且未过期且不是强制刷新，直接返回
            if (this.hasCache && !this.isCacheExpired && !forceRefresh) {
                return Promise.resolve({
                    success: true,
                    fromCache: true,
                    data: this.themes
                })
            }

            this.isLoading = true

            return getCartoonThemes().then(response => {
                const responseData = response.data || response

                if (responseData && responseData.results && responseData.results.list) {
                    this.themes = filteredThemes
                    this.lastUpdateTime = Date.now()

                    return {
                        success: true,
                        fromCache: false,
                        data: filteredThemes
                    }
                } else {
                    throw new Error('主题响应数据格式不正确')
                }
            }).catch(error => {
                console.error('获取动画主题失败:', error)
                return { success: false, error, fromCache: false }
            }).finally(() => {
                this.isLoading = false
            })
        },

        // 清除缓存
        clearCache() {
            this.themes = []
            this.lastUpdateTime = null
        }
    },

    persist: {
        key: 'cartoon-theme-store',
        storage: localStorage,
        paths: ['themes', 'lastUpdateTime']
    }
})
