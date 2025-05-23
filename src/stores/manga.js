import { defineStore } from 'pinia'

/**
 * 漫画数据存储，用于在页面跳转之间保存漫画数据，避免在URL中传递大量数据
 */
export const useMangaStore = defineStore('manga', {
    state: () => ({
        // 当前漫画的基本信息
        currentManga: null,

        // 当前漫画的所有章节信息
        currentChapters: [],

        // 当前正在阅读的章节索引
        currentChapterIndex: -1,

        // 漫画路径标识
        pathWord: ''
    }),

    getters: {
        /**
         * 获取当前章节
         */
        currentChapter: (state) => {
            if (state.currentChapters.length > 0 && state.currentChapterIndex >= 0 && state.currentChapterIndex < state.currentChapters.length) {
                return state.currentChapters[state.currentChapterIndex]
            }
            return null
        },

        /**
         * 获取上一章的ID
         */
        prevChapterId: (state) => {
            if (state.currentChapters.length > 0 && state.currentChapterIndex > 0) {
                return state.currentChapters[state.currentChapterIndex - 1].id
            }
            return null
        },

        /**
         * 获取下一章的ID
         */
        nextChapterId: (state) => {
            if (state.currentChapters.length > 0 && state.currentChapterIndex < state.currentChapters.length - 1) {
                return state.currentChapters[state.currentChapterIndex + 1].id
            }
            return null
        },

        /**
         * 是否有上一章
         */
        hasPrevChapter: (state) => {
            return state.currentChapterIndex > 0
        },

        /**
         * 是否有下一章
         */
        hasNextChapter: (state) => {
            return state.currentChapterIndex < state.currentChapters.length - 1
        }
    },

    actions: {
        /**
         * 设置当前漫画信息
         * @param {Object} manga 漫画基本信息
         */
        setCurrentManga(manga) {
            this.currentManga = manga
        },

        /**
         * 设置漫画章节及路径标识
         * @param {Array} chapters 章节列表
         * @param {string} pathWord 漫画路径标识
         */
        setChapters(chapters, pathWord) {
            this.currentChapters = chapters
            this.pathWord = pathWord
        },

        /**
         * 设置当前阅读的章节索引
         * @param {number} index 章节索引
         */
        setCurrentChapterIndex(index) {
            this.currentChapterIndex = index
        },

        /**
         * 查找章节索引
         * @param {string} chapterId 章节ID
         * @returns {number} 章节索引，未找到则返回-1
         */
        findChapterIndex(chapterId) {
            return this.currentChapters.findIndex(chapter => chapter.id === chapterId)
        },

        /**
         * 清空数据
         */
        clear() {
            this.currentManga = null
            this.currentChapters = []
            this.currentChapterIndex = -1
            this.pathWord = ''
        },

        /**
         * 清空缓存（兼容详情页刷新）
         */
        clearMangaCache() {
            this.clear()
        }
    },

    // 启用pinia持久化
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'copymanga-chapter-state',
                storage: sessionStorage // 使用sessionStorage，在会话结束时清除数据
            }
        ]
    }
})
