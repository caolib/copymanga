import { defineStore } from 'pinia'
import { getBookHome } from '../api/book'

export const useBookHomeStore = defineStore('bookHome', {
    state: () => ({
        // 分页缓存数据 - 使用对象存储不同参数组合的数据
        cache: {},
        // 最后更新时间
        lastUpdateTime: null,
        // 加载状态
        isLoading: false,
        // 错误状态
        error: ''
    }),

    getters: {
        // 检查是否有缓存
        hasCache: (state) => {
            return Object.keys(state.cache).length > 0 && state.lastUpdateTime
        },

        // 检查缓存是否过期（1天）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - state.lastUpdateTime > oneDay
        },

        // 生成缓存键
        getCacheKey: () => (ordering, page, pageSize, theme) => {
            return `${ordering}_${page}_${pageSize}_${theme}`
        }
    },

    actions: {
        /**
         * 获取轻小说主页数据
         * @param {Object} options 查询选项
         * @param {boolean} forceRefresh 是否强制刷新
         */
        async fetchBookHome(options = {}, forceRefresh = false) {
            const {
                ordering = '-popular',
                page = 1,
                pageSize = 18,
                theme = '',
                platform = 3
            } = options

            const cacheKey = this.getCacheKey(ordering, page, pageSize, theme)

            // 如果有缓存且未过期且不是强制刷新，直接返回缓存
            if (!forceRefresh && this.cache[cacheKey] && !this.isCacheExpired) {
                return Promise.resolve({
                    success: true,
                    data: this.cache[cacheKey],
                    fromCache: true
                })
            }

            this.isLoading = true
            this.error = ''

            const offset = (page - 1) * pageSize

            return getBookHome({
                ordering,
                limit: pageSize,
                offset,
                theme,
                platform
            }).then(response => {
                if (response && response.results) {
                    const data = {
                        list: response.results.list || [],
                        total: response.results.total || 0
                    }

                    // 缓存数据
                    this.cache[cacheKey] = data
                    this.lastUpdateTime = Date.now()

                    return {
                        success: true,
                        data,
                        fromCache: false
                    }
                }
                return { success: false, fromCache: false }
            }).catch(error => {
                console.error('获取轻小说列表失败:', error)
                this.error = error.message || '获取轻小说列表失败'
                return { success: false, error, fromCache: false }
            }).finally(() => {
                this.isLoading = false
            })
        },

        /**
         * 清除所有缓存
         */
        clearCache() {
            this.cache = {}
            this.lastUpdateTime = null
            this.error = ''
        },

        /**
         * 清除指定页的缓存
         */
        clearPageCache(ordering, page, pageSize, theme) {
            const cacheKey = this.getCacheKey(ordering, page, pageSize, theme)
            delete this.cache[cacheKey]
        },

        /**
         * 预加载下一页数据
         */
        async preloadNextPage(ordering, currentPage, pageSize, theme, totalCount) {
            const nextPage = currentPage + 1
            const maxPage = Math.ceil(totalCount / pageSize)

            if (nextPage <= maxPage) {
                const nextCacheKey = this.getCacheKey(ordering, nextPage, pageSize, theme)

                // 如果下一页还没有缓存，预加载
                if (!this.cache[nextCacheKey]) {
                    try {
                        await this.fetchBookHome({
                            ordering,
                            page: nextPage,
                            pageSize,
                            theme
                        })
                    } catch (error) {
                        console.warn('预加载下一页失败:', error)
                    }
                }
            }
        }
    },

    // 持久化配置
    persist: {
        key: 'copymanga-book-home',
        storage: localStorage,
        paths: ['cache', 'lastUpdateTime']
    }
})
