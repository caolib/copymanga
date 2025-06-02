import { defineStore } from 'pinia'
import { useBookStore } from './book'
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

        // 检查缓存是否过期（30分钟）
        isCacheExpired: (state) => {
            if (!state.lastUpdateTime) return true
            const now = Date.now()
            const thirtyMinutes = 30 * 60 * 1000
            return now - state.lastUpdateTime > thirtyMinutes
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
        async fetchCollection(options = {}, forceRefresh = false) {
            const {
                page = 1,
                pageSize = 18,
                ordering = '-datetime_modifier'
            } = options

            this.loading = true
            this.error = ''

            // 生成缓存键
            const cacheKey = this.getCacheKey(page, pageSize, ordering)            // 检查是否需要使用缓存
            if (!forceRefresh &&
                this.collectionCache[cacheKey] &&
                !this.isCacheExpired &&
                this.cacheParams.pageSize === pageSize &&
                this.cacheParams.ordering === ordering) {

                this.loading = false
                return {
                    success: true,
                    data: this.collectionCache[cacheKey],
                    total: this.totalCount,
                    fromCache: true
                }
            }

            try {
                const offset = (page - 1) * pageSize
                await getMyBookCollection({
                    limit: pageSize,
                    offset: offset,
                    ordering: ordering
                }).then(response => {
                    const bookList = response.results.list || []
                    const total = response.results.total || 0

                    // 缓存数据
                    this.collectionCache[cacheKey] = bookList
                    this.totalCount = total
                    this.cacheParams = { pageSize, ordering }
                    this.lastUpdateTime = Date.now()

                    this.loading = false
                    return {
                        success: true,
                        data: bookList,
                        total,
                        fromCache: false
                    }
                })

            } catch (error) {
                console.error('获取轻小说收藏列表失败:', error)
                this.error = error.message || '获取收藏列表失败'
                this.loading = false
                return {
                    success: false,
                    error: this.error,
                    data: [],
                    total: 0
                }
            }
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
         * 预加载下一页数据
         */
        async preloadNextPage(currentPage, pageSize, ordering) {
            const nextPage = currentPage + 1
            const nextCacheKey = this.getCacheKey(nextPage, pageSize, ordering)

            // 如果下一页还没有缓存，预加载
            if (!this.collectionCache[nextCacheKey]) {
                try {
                    await this.fetchCollection({
                        page: nextPage,
                        pageSize,
                        ordering
                    })
                } catch (error) {
                    console.warn('预加载下一页失败:', error)
                }
            }
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
