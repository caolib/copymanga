import { defineStore } from 'pinia'
import { getPostRank } from '../api/post'
import { message } from 'ant-design-vue'

export const usePostRankingStore = defineStore('post-ranking', {
    state: () => ({
        // 排行榜数据
        weekRanking: {
            list: [],
            total: 0,
            loading: false,
            error: null
        },
        monthRanking: {
            list: [],
            total: 0,
            loading: false,
            error: null
        },
        totalRanking: {
            list: [],
            total: 0,
            loading: false,
            error: null
        },
        // 分页配置
        pageConfig: {
            week: { current: 1, size: 18 },
            month: { current: 1, size: 18 },
            total: { current: 1, size: 18 }
        },
        // 最后更新时间
        lastUpdateTime: null
    }),

    getters: {
        // 获取指定类型的排行榜数据
        getRankingData: (state) => (type) => {
            return state[`${type}Ranking`] || { list: [], total: 0, loading: false, error: null }
        },
        // 获取指定类型的分页配置
        getPageConfig: (state) => (type) => {
            return state.pageConfig[type] || { current: 1, size: 18 }
        }
    },

    actions: {
        // 获取排行榜数据
        async fetchRankingData(dateType, page = 1, pageSize = 18, force = false) {
            const rankingKey = `${dateType}Ranking`
            const pageKey = dateType

            // 如果不是强制刷新且已有数据，则跳过
            if (!force && this[rankingKey].list.length > 0 && page === 1) {
                return
            }

            this[rankingKey].loading = true
            this[rankingKey].error = null

            const offset = (page - 1) * pageSize

            await getPostRank(6, dateType, pageSize, offset, 'male').then(response => {
                if (response && response.results) {
                    if (page === 1) {
                        this[rankingKey].list = response.results.list || []
                    } else {
                        this[rankingKey].list.push(...(response.results.list || []))
                    }
                    this[rankingKey].total = response.results.total || 0

                    // 更新分页配置
                    this.pageConfig[pageKey] = { current: page, size: pageSize }

                    // 更新最后更新时间
                    this.lastUpdateTime = new Date()
                }
            }).catch(error => {
                console.error(`获取${dateType}排行榜失败:`, error)
                this[rankingKey].error = error.message || '获取数据失败'
                message.error(`获取${dateType}排行榜失败`)
            }).finally(() => {
                this[rankingKey].loading = false
            })
        },

        // 获取周排行榜
        async fetchWeekRanking(page = 1, pageSize = 18, force = false) {
            return this.fetchRankingData('week', page, pageSize, force)
        },

        // 获取月排行榜
        async fetchMonthRanking(page = 1, pageSize = 18, force = false) {
            return this.fetchRankingData('month', page, pageSize, force)
        },

        // 获取总排行榜
        async fetchTotalRanking(page = 1, pageSize = 18, force = false) {
            return this.fetchRankingData('total', page, pageSize, force)
        },

        // 刷新所有排行榜数据
        async refreshAllRankings() {
            await Promise.all([
                this.fetchWeekRanking(1, 18, true),
                this.fetchMonthRanking(1, 18, true),
                this.fetchTotalRanking(1, 18, true)
            ])
        },

        // 重置指定类型的排行榜数据
        resetRankingData(dateType) {
            const rankingKey = `${dateType}Ranking`
            this[rankingKey] = {
                list: [],
                total: 0,
                loading: false,
                error: null
            }
            this.pageConfig[dateType] = { current: 1, size: 18 }
        },

        // 重置所有数据
        resetAllData() {
            this.resetRankingData('week')
            this.resetRankingData('month')
            this.resetRankingData('total')
            this.lastUpdateTime = null
        }
    }
})