import { defineStore } from 'pinia'
import { getCartoonHome } from '../api/cartoon'

export const useCartoonStore = defineStore('cartoon', {
    state: () => ({
        cartoonData: {
            '-datetime_updated': {
                list: [],
                total: 0,
                lastUpdateTime: null,
                hasMore: true,
                nextOffset: 0
            },
            '-popular': {
                list: [],
                total: 0,
                lastUpdateTime: null,
                hasMore: true,
                nextOffset: 0
            }
        },
        isLoading: false,
        isLoadingMore: false
    }),

    getters: {
        // 检查指定排序方式是否有缓存
        hasCache: (state) => (ordering) => {
            const data = state.cartoonData[ordering]
            return data && data.list.length > 0 && data.lastUpdateTime
        },        // 检查缓存是否过期（1天）
        isCacheExpired: (state) => (ordering) => {
            const data = state.cartoonData[ordering]
            if (!data || !data.lastUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - data.lastUpdateTime > oneDay
        },

        // 获取指定排序的数据
        getCartoonList: (state) => (ordering) => {
            return state.cartoonData[ordering] || {
                list: [],
                total: 0,
                lastUpdateTime: null,
                hasMore: true,
                nextOffset: 0
            }
        }
    },

    actions: {
        async fetchCartoonHome(ordering = '-datetime_updated', limit = 18, offset = 0, forceRefresh = false) {
            const cacheKey = ordering
            const cacheData = this.cartoonData[cacheKey]

            // 如果是加载更多
            if (offset > 0) {
                this.isLoadingMore = true
            } else {
                // 如果有缓存且未过期且不是强制刷新，直接返回
                if (this.hasCache(ordering) && !this.isCacheExpired(ordering) && !forceRefresh) {
                    return Promise.resolve({
                        success: true,
                        fromCache: true,
                        results: cacheData
                    })
                }
                this.isLoading = true
            }

            return getCartoonHome(limit, offset, ordering).then(response => {
                const { list, total } = response.results

                if (offset === 0) {
                    // 首次加载或刷新
                    this.cartoonData[cacheKey] = {
                        list: list || [],
                        total: total || 0,
                        lastUpdateTime: Date.now(),
                        hasMore: (list?.length || 0) < (total || 0),
                        nextOffset: limit
                    }
                } else {
                    // 加载更多
                    const existingData = this.cartoonData[cacheKey]
                    const newList = [...(existingData.list || []), ...(list || [])]

                    this.cartoonData[cacheKey] = {
                        ...existingData,
                        list: newList,
                        total: total || 0,
                        hasMore: newList.length < (total || 0),
                        nextOffset: offset + limit
                    }
                }

                return {
                    success: true,
                    fromCache: false,
                    results: this.cartoonData[cacheKey]
                }
            }).catch(error => {
                console.error('获取动画列表失败:', error)
                return { success: false, error, fromCache: false }
            }).finally(() => {
                this.isLoading = false
                this.isLoadingMore = false
            })
        },

        // 清除指定排序的缓存
        clearCache(ordering) {
            if (ordering) {
                this.cartoonData[ordering] = {
                    list: [],
                    total: 0,
                    lastUpdateTime: null,
                    hasMore: true,
                    nextOffset: 0
                }
            } else {
                // 清除所有缓存
                Object.keys(this.cartoonData).forEach(key => {
                    this.cartoonData[key] = {
                        list: [],
                        total: 0,
                        lastUpdateTime: null,
                        hasMore: true,
                        nextOffset: 0
                    }
                })
            }
        }
    },

    persist: {
        key: 'cartoon-store',
        storage: localStorage,
        paths: ['cartoonData']
    }
})
