import { defineStore } from 'pinia'
import { getHomeIndex, getNewestManga } from '../api/manga'

export const useHomeStore = defineStore('home', {
  state: () => ({
    homeData: {},
    newestData: {},
    lastUpdateTime: null,
    lastNewestUpdateTime: null,
    isLoading: false,
    isNewestLoading: false,
    activeTab: 'home', // 当前激活的标签页：'home' 或 'newest'
  }),
  getters: {
    hasCache: (state) => {
      return Object.keys(state.homeData).length > 0 && state.lastUpdateTime
    },
    // 检查缓存是否过期（1天）
    isCacheExpired: (state) => {
      if (!state.lastUpdateTime) return true
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      return now - state.lastUpdateTime > oneDay
    },
    hasNewestCache: (state) => {
      return Object.keys(state.newestData).length > 0 && state.lastNewestUpdateTime
    },
    isNewestCacheExpired: (state) => {
      if (!state.lastNewestUpdateTime) return true
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      return now - state.lastNewestUpdateTime > oneDay
    },
  },
  actions: {
    async fetchHomeData(forceRefresh = false) {
      // 如果有缓存且未过期且不是强制刷新，直接返回
      if (this.hasCache && !this.isCacheExpired && !forceRefresh) {
        return Promise.resolve({ success: true, fromCache: true })
      }

      this.isLoading = true

      return getHomeIndex()
        .then((res) => {
          if (res && res.code === 200 && res.results) {
            this.homeData = res.results
            this.lastUpdateTime = Date.now()
            return { success: true, fromCache: false }
          }
          return { success: false, fromCache: false }
        })
        .catch((error) => {
          console.error('获取主页数据失败:', error)
          return { success: false, error, fromCache: false }
        })
        .finally(() => {
          this.isLoading = false
        })
    },
    async fetchNewestData(forceRefresh = false) {
      // 如果有缓存且未过期且不是强制刷新，直接返回
      if (this.hasNewestCache && !this.isNewestCacheExpired && !forceRefresh) {
        return Promise.resolve({ success: true, fromCache: true })
      }

      this.isNewestLoading = true

      return getNewestManga()
        .then((res) => {
          if (res && res.code === 200 && res.results) {
            this.newestData = res.results
            this.lastNewestUpdateTime = Date.now()
            return { success: true, fromCache: false }
          }
          return { success: false, fromCache: false }
        })
        .catch((error) => {
          console.error('获取最新漫画数据失败:', error)
          return { success: false, error, fromCache: false }
        })
        .finally(() => {
          this.isNewestLoading = false
        })
    },
    clearCache() {
      this.homeData = {}
      this.lastUpdateTime = null
    },
  },
  // 持久化配置
  persist: {
    key: 'copymanga-home',
    storage: localStorage,
    paths: ['homeData', 'newestData', 'lastUpdateTime', 'lastNewestUpdateTime', 'activeTab'],
  },
})
