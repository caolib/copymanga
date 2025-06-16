import { defineStore } from 'pinia'
import { getPostCollection } from '../api/post'

export const usePostCollectionStore = defineStore('postCollection', {
    state: () => ({
        // 分页缓存数据 - 使用对象存储不同页的数据
        postCollectionCache: {},
        // 总数缓存
        totalCount: 0,
        // 缓存参数
        cacheParams: {
            pageSize: 18,
            ordering: '-datetime_updated'
        },
        // 最后更新时间
        lastUpdateTime: null,
        // 加载状态
        loading: false,
        error: ''
    }),

    getters: {
        // 检查是否有缓存
        hasCache: (state) => {
            return Object.keys(state.postCollectionCache).length > 0 && state.lastUpdateTime
        },

        // 检查缓存是否过期（1天）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - state.lastUpdateTime > oneDay
        },

        // 获取指定页的缓存数据
        getPageCache: (state) => (pageNumber, pageSize, ordering) => {
            const cacheKey = `${pageNumber}_${pageSize}_${ordering}`
            return state.postCollectionCache[cacheKey]
        },

        // 检查指定页是否有缓存
        hasPageCache: (state) => (pageNumber, pageSize, ordering) => {
            const cacheKey = `${pageNumber}_${pageSize}_${ordering}`
            return !!state.postCollectionCache[cacheKey]
        }
    },

    actions: {
        /**
         * 获取写真收藏数据
         * @param {Object} options 查询参数
         * @param {number} options.page 页码
         * @param {number} options.pageSize 页大小
         * @param {string} options.ordering 排序
         * @param {boolean} forceRefresh 是否强制刷新
         */
        async fetchPostCollection(options = {}, forceRefresh = false) {
            const {
                page = 1,
                pageSize = 18,
                ordering = '-datetime_updated'
            } = options

            const cacheKey = `${page}_${pageSize}_${ordering}`

            // 如果有缓存且未过期且不是强制刷新，返回缓存数据
            if (!forceRefresh && this.hasPageCache(page, pageSize, ordering) && !this.isCacheExpired) {
                return Promise.resolve({
                    success: true,
                    fromCache: true,
                    data: this.postCollectionCache[cacheKey],
                    total: this.totalCount
                })
            }

            this.loading = true
            this.error = ''

            const params = {
                offset: (page - 1) * pageSize,
                limit: pageSize,
                free_type: 1,
                ordering: ordering
            }

            return getPostCollection(params.offset, params.limit, params.free_type, params.ordering)
                .then(res => {
                    if (res && res.code === 200 && res.results) {
                        // 缓存当前页数据
                        this.postCollectionCache[cacheKey] = res.results.list
                        this.totalCount = res.results.total || 0
                        this.cacheParams = { pageSize, ordering }
                        this.lastUpdateTime = Date.now()

                        return {
                            success: true,
                            fromCache: false,
                            data: res.results.list,
                            total: res.results.total || 0
                        }
                    }

                    this.error = '获取写真收藏数据失败'
                    return { success: false, fromCache: false }
                })
                .catch(error => {
                    console.error('获取写真收藏数据失败:', error)
                    this.error = error.message || '网络请求失败'
                    return { success: false, error, fromCache: false }
                })
                .finally(() => {
                    this.loading = false
                })
        },

        /**
         * 清除所有缓存
         */
        clearCache() {
            this.postCollectionCache = {}
            this.totalCount = 0
            this.lastUpdateTime = null
            this.error = ''
        },

        /**
         * 清除指定页的缓存
         */
        clearPageCache(page, pageSize, ordering) {
            const cacheKey = `${page}_${pageSize}_${ordering}`
            delete this.postCollectionCache[cacheKey]
        }
    },

    persist: {
        key: 'post-collection-store',
        storage: localStorage,
        paths: ['postCollectionCache', 'totalCount', 'cacheParams', 'lastUpdateTime']
    }
})
