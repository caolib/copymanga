import { defineStore } from 'pinia'
import { getTopicInfo, getTopicContent } from '../api/topic'

export const useTopicStore = defineStore('topic', {
    state: () => ({
        topicsList: [],
        currentTopic: null,
        currentTopicContent: [],
        isLoading: false,
        contentLoading: false,
        currentPage: 1,
        pageSize: 25,
        total: 0
    }),

    getters: {
        hasTopics: (state) => state.topicsList.length > 0
    },

    actions: {
        // 设置专题列表（从主页数据中获取）
        setTopicsList(topics) {
            this.topicsList = topics || []
        },

        // 获取专题详情
        async fetchTopicInfo(topicId) {
            this.isLoading = true
            try {
                const res = await getTopicInfo(topicId)
                if (res && res.code === 200 && res.results) {
                    this.currentTopic = res.results
                    return { success: true, data: res.results }
                }
                return { success: false, message: '获取专题信息失败' }
            } catch (error) {
                console.error('获取专题信息失败:', error)
                return { success: false, error }
            } finally {
                this.isLoading = false
            }
        },

        // 获取专题内容
        async fetchTopicContent(topicId, type = 1, offset = 0, limit = 25) {
            this.contentLoading = true
            try {
                const res = await getTopicContent(topicId, type, offset, limit)
                if (res && res.code === 200 && res.results) {
                    this.currentTopicContent = res.results.list || []
                    this.total = res.results.total || 0
                    return { success: true, data: res.results }
                }
                return { success: false, message: '获取专题内容失败' }
            } catch (error) {
                console.error('获取专题内容失败:', error)
                return { success: false, error }
            } finally {
                this.contentLoading = false
            }
        },

        // 清空当前专题数据
        clearCurrentTopic() {
            this.currentTopic = null
            this.currentTopicContent = []
            this.currentPage = 1
            this.total = 0
        }
    }
})
