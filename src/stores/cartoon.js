import { defineStore } from 'pinia'
import { getCartoonHome, getCartoonThemes } from '../api/cartoon'

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
        // 主题数据
        themes: [],
        themesLastUpdateTime: null,
        isLoading: false,
        isLoadingMore: false,
        isLoadingThemes: false
    }),

    getters: {        // 检查指定排序方式是否有缓存
        hasCache: (state) => (cacheKey) => {
            const data = state.cartoonData[cacheKey]
            return data && data.list.length > 0 && data.lastUpdateTime
        },

        // 检查缓存是否过期（1天）
        isCacheExpired: (state) => (cacheKey) => {
            const data = state.cartoonData[cacheKey]
            if (!data || !data.lastUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - data.lastUpdateTime > oneDay
        },        // 获取指定排序的数据
        getCartoonList: (state) => (ordering, theme = '') => {
            const cacheKey = `${ordering}_${theme}`
            return state.cartoonData[cacheKey] || {
                list: [],
                total: 0,
                lastUpdateTime: null,
                hasMore: true,
                nextOffset: 0
            }
        },

        // 检查主题缓存是否有效
        hasThemeCache(state) {
            return state.themes.length > 0 && state.themesLastUpdateTime
        },

        // 检查主题缓存是否过期（7天）
        isThemeCacheExpired(state) {
            if (!state.themesLastUpdateTime) return true
            const now = Date.now()
            const sevenDays = 7 * 24 * 60 * 60 * 1000
            return now - state.themesLastUpdateTime > sevenDays
        }
    },

    actions: {
        async fetchCartoonHome(ordering = '-datetime_updated', limit = 18, offset = 0, theme = '', forceRefresh = false) {
            const cacheKey = `${ordering}_${theme}`

            // 确保缓存数据结构存在
            if (!this.cartoonData[cacheKey]) {
                this.cartoonData[cacheKey] = {
                    list: [],
                    total: 0,
                    lastUpdateTime: null,
                    hasMore: true,
                    nextOffset: 0
                }
            }

            const cacheData = this.cartoonData[cacheKey]

            // 如果是加载更多
            if (offset > 0) {
                this.isLoadingMore = true
            } else {
                // 如果有缓存且未过期且不是强制刷新，直接返回
                if (this.hasCache(cacheKey) && !this.isCacheExpired(cacheKey) && !forceRefresh) {
                    return Promise.resolve({
                        success: true,
                        fromCache: true,
                        results: cacheData
                    })
                }
                this.isLoading = true
            }

            return getCartoonHome(limit, offset, ordering, theme).then(response => {
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

        // 获取动画主题列表
        async fetchCartoonThemes(forceRefresh = false) {
            // 如果有缓存且未过期且不是强制刷新，直接返回
            if (this.hasThemeCache && !this.isThemeCacheExpired && !forceRefresh) {
                return Promise.resolve({
                    success: true,
                    fromCache: true,
                    data: this.themes
                })
            }

            this.isLoadingThemes = true

            return getCartoonThemes().then(response => {
                const responseData = response.data || response

                if (responseData && responseData.results && responseData.results.list) {
                    // 过滤掉count为0的主题
                    const filteredThemes = responseData.results.list.filter(theme => theme.count > 0)

                    this.themes = filteredThemes
                    this.themesLastUpdateTime = Date.now()

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
                this.isLoadingThemes = false
            })
        },        // 清除指定排序的缓存
        clearCache(cacheKey) {
            if (cacheKey) {
                this.cartoonData[cacheKey] = {
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
        },

        // 清除主题缓存
        clearThemeCache() {
            this.themes = []
            this.themesLastUpdateTime = null
        }
    }, persist: {
        key: 'cartoon-store',
        storage: localStorage,
        paths: ['cartoonData', 'themes', 'themesLastUpdateTime']
    }
})
