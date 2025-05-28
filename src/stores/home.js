import { defineStore } from 'pinia'
import { getHomeIndex } from '../api/manga'

export const useHomeStore = defineStore('home', {
    state: () => ({
        homeData: {},
        lastUpdateTime: null,
        isLoading: false
    }),
    getters: {
        hasCache: (state) => {
            return Object.keys(state.homeData).length > 0 && state.lastUpdateTime
        },
        // 检查缓存是否过期（1小时）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const oneHour = 60 * 60 * 1000
            return now - state.lastUpdateTime > oneHour
        }
    }, actions: {
        async fetchHomeData(forceRefresh = false) {
            // 如果有缓存且未过期且不是强制刷新，直接返回
            if (this.hasCache && !this.isCacheExpired && !forceRefresh) {
                return Promise.resolve({ success: true, fromCache: true })
            }

            this.isLoading = true

            return getHomeIndex()
                .then(res => {
                    if (res && res.code === 200 && res.results) {
                        this.homeData = res.results
                        this.lastUpdateTime = Date.now()
                        return { success: true, fromCache: false }
                    }
                    return { success: false, fromCache: false }
                })
                .catch(error => {
                    console.error('获取主页数据失败:', error)
                    return { success: false, error, fromCache: false }
                })
                .finally(() => {
                    this.isLoading = false
                })
        },
        clearCache() {
            this.homeData = {}
            this.lastUpdateTime = null
        }
    },
    // 持久化配置
    persist: {
        key: 'copymanga-home',
        storage: localStorage,
        paths: ['homeData', 'lastUpdateTime']
    }
})