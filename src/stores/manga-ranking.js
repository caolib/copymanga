import { defineStore } from 'pinia'
import { getMangaRanking } from '../api/manga'

export const useMangaRankingStore = defineStore('manga-ranking', {
    state: () => ({
        rankingData: {},
        isLoading: false,
        currentType: 1, // 1:漫画, 5:轻小说
        currentDateType: 'week',
        currentAudienceType: '',
        pagination: {
            limit: 18,
            offset: 0,
            total: 0
        }
    }),
    getters: {
        // 获取排行榜列表
        rankingList: (state) => {
            return state.rankingData?.list || []
        }
    },
    actions: {
        // 设置内容类型
        setType(type) {
            if (this.currentType !== type) {
                this.currentType = type
                // 重置分页
                this.pagination.offset = 0
                this.fetchRankingData()
            }
        },
        // 设置排行榜类型
        setDateType(dateType) {
            if (this.currentDateType !== dateType) {
                this.currentDateType = dateType
                // 重置分页
                this.pagination.offset = 0
                this.fetchRankingData()
            }
        },
        // 设置受众类型
        setAudienceType(audienceType) {
            if (this.currentAudienceType !== audienceType) {
                this.currentAudienceType = audienceType
                // 重置分页
                this.pagination.offset = 0
                this.fetchRankingData()
            }
        },
        // 加载更多数据
        loadMore() {
            if (this.isLoading) return Promise.resolve({ success: false, reason: 'loading' })
            if (this.pagination.offset + this.pagination.limit >= this.pagination.total) {
                return Promise.resolve({ success: false, reason: 'nomore' })
            }

            this.pagination.offset += this.pagination.limit
            return this.fetchRankingData(true)
        },
        // 获取排行榜数据
        async fetchRankingData(isLoadMore = false) {
            // 每次都重新获取最新数据，不使用缓存
            this.isLoading = true

            return getMangaRanking(
                this.currentType,
                this.currentDateType,
                this.currentAudienceType,
                this.pagination.limit,
                this.pagination.offset
            )
                .then(res => {
                    if (res && res.code === 200 && res.results) {
                        if (isLoadMore && this.rankingData.list) {
                            // 加载更多，合并列表数据
                            this.rankingData = {
                                ...res.results,
                                list: [...this.rankingData.list, ...res.results.list]
                            }
                        } else {
                            // 首次加载或刷新，直接替换数据
                            this.rankingData = res.results
                        }

                        // 更新分页信息
                        this.pagination.total = res.results.total || 0

                        return { success: true }
                    }
                    return { success: false }
                })
                .catch(error => {
                    console.error('获取排行榜数据失败:', error)
                    return { success: false, error }
                })
                .finally(() => {
                    this.isLoading = false
                })
        }
    }
}) 