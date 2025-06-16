import { defineStore } from 'pinia'
import { useBookStore } from './book'
import { useUserStore } from './user'
import { getMyBookCollection } from '../api/book'

export const useBookCollectionStore = defineStore('book-collection', {
    state: () => ({
        // 分页缓存数据 - 使用对象存储不同页的数据
        collectionCache: {},
        // 总数缓存
        totalCount: 0,
        // 缓存参数
        cacheParams: {
            pageSize: 18,
            ordering: '-datetime_modifier'
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
            return Object.keys(state.collectionCache).length > 0 && state.lastUpdateTime
        },

        // 检查缓存是否过期（1天）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - state.lastUpdateTime > oneDay
        },

        // 生成缓存键
        getCacheKey: () => (page, pageSize, ordering) => {
            return `${page}-${pageSize}-${ordering}`
        }
    },

    actions: {
        /**
         * 获取收藏数据
         * @param {Object} options 查询选项
         * @param {boolean} forceRefresh 是否强制刷新
         */
        fetchCollection(options = {}, forceRefresh = false) {
            const {
                page = 1,
                pageSize = 18,
                ordering = '-datetime_modifier'
            } = options

            // 检查用户登录状态
            const userStore = useUserStore()
            if (!userStore.isLoggedIn || !userStore.token) {
                this.loading = false
                return Promise.reject(new Error('请先登录'))
            }

            this.loading = true
            this.error = ''

            // 生成缓存键
            const cacheKey = this.getCacheKey(page, pageSize, ordering)

            // 如果不是强制刷新且有缓存，优先使用缓存（简化逻辑）
            if (!forceRefresh && this.collectionCache[cacheKey]) {
                this.loading = false
                return Promise.resolve({
                    data: this.collectionCache[cacheKey],
                    total: this.totalCount,
                    fromCache: true
                })
            }

            // 发送请求获取新数据
            return getMyBookCollection({
                limit: pageSize,
                offset: (page - 1) * pageSize,
                ordering: ordering
            }).then(response => {
                // 检查响应结构
                if (!response || !response.results) {
                    throw new Error('API响应格式错误')
                }

                const bookList = response.results.list || []
                const total = response.results.total || 0

                // 缓存数据
                this.collectionCache[cacheKey] = bookList
                this.totalCount = total
                this.cacheParams = { pageSize, ordering }
                this.lastUpdateTime = Date.now()

                this.loading = false
                return {
                    data: bookList,
                    total,
                    fromCache: false
                }
            }).catch(error => {
                this.error = error.message || '获取收藏列表失败'
                this.loading = false
                throw error
            })
        },

        /**
         * 更新缓存数据（供组件直接调用API后使用）
         * @param {Object} params 缓存参数
         */
        updateCache(params) {
            const { page, pageSize, ordering, data, total } = params
            const cacheKey = this.getCacheKey(page, pageSize, ordering)

            // 更新缓存
            this.collectionCache[cacheKey] = data
            this.totalCount = total
            this.cacheParams = { pageSize, ordering }
            this.lastUpdateTime = Date.now()
        },

        /**
         * 清除所有缓存
         */
        clearCache() {
            this.collectionCache = {}
            this.totalCount = 0
            this.lastUpdateTime = null
            this.error = ''
        },

        /**
         * 清除指定页的缓存
         */
        clearPageCache(page, pageSize, ordering) {
            const cacheKey = this.getCacheKey(page, pageSize, ordering)
            delete this.collectionCache[cacheKey]
        },

        /**
         * 设置当前轻小说信息到 bookStore 中
         * @param {Object} book 轻小说信息
         */
        setCurrentBook(book) {
            const bookStore = useBookStore()
            bookStore.setCurrentBook(book)

            // 如果有 path_word，也设置它
            if (book.path_word) {
                bookStore.pathWord = book.path_word
            }
        }
    },

    // 持久化配置
    persist: {
        key: 'copymanga-book-collection',
        storage: localStorage,
        paths: ['collectionCache', 'totalCount', 'cacheParams', 'lastUpdateTime']
    }
})
