import { defineStore } from 'pinia'
import { getPostHome } from '../api/post'

export const usePostHomeStore = defineStore('postHome', {
    state: () => ({
        homeData: null,
        lastUpdated: null,
        loading: false
    }),
    getters: {
        banners: (state) => state.homeData?.banners || [],
        newPosts: (state) => state.homeData?.newPosts || [],
        weekRanking: (state) => state.homeData?.rankWeekPosts?.list || [],
        monthRanking: (state) => state.homeData?.rankMonthPosts?.list || []
    },
    actions: {
        async fetchHomeData(forceRefresh = false) {
            // 如果已有数据且不强制刷新，则直接返回
            if (this.homeData && !forceRefresh) {
                return
            }

            this.loading = true

            await getPostHome().then(response => {
                if (response.results) {
                    this.homeData = response.results
                    this.lastUpdated = new Date().toISOString()
                }
            }).catch(err => {
                console.error('获取写真首页数据失败:', err)
                throw err
            }).finally(() => {
                this.loading = false
            })
        }
    },
    persist: {
        paths: ['homeData', 'lastUpdated']
    }
})
