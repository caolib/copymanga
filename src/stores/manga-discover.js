import { defineStore } from 'pinia'
import { getMangaFilterTags, getMangaDiscover } from '../api/manga'

export const useMangaDiscoverStore = defineStore('mangaDiscover', {
    state: () => ({
        // 过滤标签数据
        filterTags: {
            theme: [],
            ordering: [],
            top: []
        },
        // 当前选中的过滤条件
        currentFilter: {
            theme: '',
            ordering: '-popular',
            top: ''
        },
        // 漫画列表数据
        mangaList: [],
        // 分页信息
        pagination: {
            total: 0,
            limit: 18,
            offset: 0,
            loadedCount: 0 // 已加载的数据数量
        },
        // 加载状态
        isLoading: false,
        // 标签最后更新时间
        lastTagsUpdateTime: null,
        // 列表最后更新时间
        lastListUpdateTime: null,
        // 缓存标志
        hasCache: false,
        // 标签缓存标志
        hasTagsCache: false
    }),

    getters: {
        // 检查标签缓存是否过期（3天）
        isTagsCacheExpired: (state) => {
            if (!state.lastTagsUpdateTime) return true
            const now = Date.now()
            const threeDays = 3 * 24 * 60 * 60 * 1000
            return now - state.lastTagsUpdateTime > threeDays
        },

        // 检查列表缓存是否过期（1天）
        isListCacheExpired: (state) => {
            if (!state.lastListUpdateTime) return true
            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            return now - state.lastListUpdateTime > oneDay
        },

        // 是否有更多数据可加载
        hasMore: (state) => {
            // 使用已加载的数据数量而不是offset，避免在加载过程中状态错误
            return state.pagination.loadedCount < state.pagination.total
        }
    },

    actions: {
        // 获取过滤标签
        async fetchFilterTags(forceRefresh = false) {
            // 如果有缓存且未过期且不是强制刷新，直接返回
            if (this.hasTagsCache && this.filterTags.theme.length > 0 && !this.isTagsCacheExpired && !forceRefresh) {
                console.log('使用过滤标签缓存')
                return Promise.resolve({ success: true, fromCache: true })
            }

            return getMangaFilterTags()
                .then(res => {
                    if (res && res.code === 200 && res.results) {
                        this.filterTags = {
                            theme: res.results.theme || [],
                            ordering: res.results.ordering || [],
                            top: res.results.top || []
                        }
                        this.lastTagsUpdateTime = Date.now()
                        this.hasTagsCache = true
                        console.log('获取新的过滤标签数据')
                        return { success: true, fromCache: false }
                    }
                    return { success: false, fromCache: false }
                })
                .catch(error => {
                    console.error('获取漫画过滤标签失败:', error)
                    return { success: false, error, fromCache: false }
                })
        },

        // 获取漫画列表
        async fetchMangaList(forceRefresh = false, resetOffset = true) {
            // 重置偏移量（用于切换过滤条件时）
            if (resetOffset) {
                this.pagination.offset = 0
                this.pagination.loadedCount = 0
                this.mangaList = []
            }

            // 使用缓存的关键条件
            const useCache =
                this.hasCache &&
                this.mangaList.length > 0 &&
                !this.isListCacheExpired &&
                !forceRefresh &&
                resetOffset;

            // 如果可以使用缓存，直接返回
            if (useCache) {
                console.log('使用漫画列表缓存')
                return Promise.resolve({ success: true, fromCache: true })
            }

            this.isLoading = true

            const params = {
                limit: this.pagination.limit,
                offset: this.pagination.offset,
                ordering: this.currentFilter.ordering
            }

            // 只添加非空的过滤条件
            if (this.currentFilter.theme) {
                params.theme = this.currentFilter.theme
            }

            if (this.currentFilter.top) {
                params.top = this.currentFilter.top
            }

            return getMangaDiscover(params)
                .then(res => {
                    if (res && res.code === 200 && res.results) {
                        const newItems = res.results.list || []

                        // 合并数据（加载更多时）或替换数据（切换过滤条件时）
                        this.mangaList = resetOffset
                            ? newItems
                            : [...this.mangaList, ...newItems]

                        this.pagination = {
                            total: res.results.total || 0,
                            limit: res.results.limit || 18,
                            offset: res.results.offset + (res.results.limit || 18),
                            loadedCount: this.mangaList.length // 更新已加载数量
                        }

                        this.lastListUpdateTime = Date.now()
                        this.hasCache = true
                        console.log('获取新的漫画列表数据')
                        return { success: true, fromCache: false }
                    }
                    return { success: false, fromCache: false }
                })
                .catch(error => {
                    console.error('获取漫画列表失败:', error)
                    return { success: false, error, fromCache: false }
                })
                .finally(() => {
                    this.isLoading = false
                })
        },

        // 加载更多漫画
        async loadMore() {
            if (this.isLoading || !this.hasMore) return

            return this.fetchMangaList(false, false)
        },

        // 更新过滤条件
        updateFilter(filter) {
            this.currentFilter = { ...this.currentFilter, ...filter }
            // 更新过滤条件后重新获取数据
            this.fetchMangaList(true)
        },

        // 清除缓存
        clearCache() {
            this.mangaList = []
            this.pagination.loadedCount = 0
            this.lastListUpdateTime = null
            this.hasCache = false
        }
    },

    // 持久化配置
    persist: {
        key: 'copymanga-discover',
        storage: localStorage,
        paths: ['filterTags', 'currentFilter', 'lastTagsUpdateTime', 'lastListUpdateTime', 'hasCache', 'hasTagsCache', 'mangaList', 'pagination']
    }
}) 