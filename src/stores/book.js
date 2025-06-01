import { defineStore } from 'pinia'

/**
 * 轻小说数据存储，用于在页面跳转之间保存轻小说数据，避免在URL中传递大量数据
 */
export const useBookStore = defineStore('book', {
    state: () => ({
        // 当前轻小说的基本信息
        currentBook: null,

        // 当前轻小说的所有章节信息
        currentChapters: [],

        // 当前正在阅读的章节索引
        currentChapterIndex: -1,

        // 轻小说路径标识
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
         * 获取上一章节
         */
        prevChapter: (state) => {
            if (state.currentChapterIndex > 0) {
                return state.currentChapters[state.currentChapterIndex - 1]
            }
            return null
        },

        /**
         * 获取下一章节
         */
        nextChapter: (state) => {
            if (state.currentChapterIndex >= 0 && state.currentChapterIndex < state.currentChapters.length - 1) {
                return state.currentChapters[state.currentChapterIndex + 1]
            }
            return null
        }
    },

    actions: {
        /**
         * 设置当前轻小说信息
         * @param {Object} book 轻小说基本信息
         */
        setCurrentBook(book) {
            this.currentBook = book
        },

        /**
         * 设置轻小说章节及路径标识
         * @param {Array} chapters 章节列表
         * @param {string} pathWord 轻小说路径标识
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
            this.currentBook = null
            this.currentChapters = []
            this.currentChapterIndex = -1
            this.pathWord = ''
        },

        /**
         * 清空缓存（兼容详情页刷新）
         */
        clearBookCache() {
            this.clear()
        }
    },

    // 启用pinia持久化
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'copymanga-book-state',
                storage: sessionStorage // 使用sessionStorage，在会话结束时清除数据
            }
        ]
    }
})
