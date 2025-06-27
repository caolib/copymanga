import { defineStore } from 'pinia'

export const useCartoonPlayerStore = defineStore('current-cartoon', {
  state: () => ({
    // 当前动画的章节列表
    currentCartoonChapters: [],
    // 当前动画的pathWord
    currentCartoonPathWord: '',
  }),

  persist: {
    key: 'current-cartoon',
    storage: localStorage,
  },

  actions: {
    // 设置当前动画的章节列表
    setChapters(pathWord, chapters) {
      this.currentCartoonPathWord = pathWord
      this.currentCartoonChapters = chapters || []
    },
  },
})
