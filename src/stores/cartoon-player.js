import { defineStore } from 'pinia'

export const useCartoonPlayerStore = defineStore('current-cartoon', {
    state: () => ({
        // 当前动画的章节列表
        currentCartoonChapters: [],
        // 当前动画的pathWord
        currentCartoonPathWord: ''
    }),

    persist: {
        key: 'current-cartoon',
        storage: localStorage
    },

    actions: {
        // 设置当前动画的章节列表
        setChapters(pathWord, chapters) {
            this.currentCartoonPathWord = pathWord
            this.currentCartoonChapters = chapters || []
        },

        // 根据当前章节uuid获取上一集和下一集
        getAdjacentChapters(currentUuid) {
            if (!this.currentCartoonChapters.length || !currentUuid) {
                return { prevChapter: null, nextChapter: null }
            }

            const currentIndex = this.currentCartoonChapters.findIndex(chapter => chapter.uuid === currentUuid)

            if (currentIndex === -1) {
                return { prevChapter: null, nextChapter: null }
            }

            const prevChapter = currentIndex > 0 ? this.currentCartoonChapters[currentIndex - 1] : null
            const nextChapter = currentIndex < this.currentCartoonChapters.length - 1
                ? this.currentCartoonChapters[currentIndex + 1]
                : null

            return { prevChapter, nextChapter }
        },

        // 清除章节缓存
        clearChapters() {
            this.currentCartoonChapters = []
            this.currentCartoonPathWord = ''
        }
    }
})
