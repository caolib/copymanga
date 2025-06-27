import { defineStore } from 'pinia'
import { getNewestPost } from '../api/post'

export const usePostNewStore = defineStore('postNew', {
  state: () => ({
    loading: false,
    newPosts: [],
    total: 0,
    pageSize: 18, // 默认每页18条
    currentPage: 1,
    lastUpdated: null,
  }),

  actions: {
    async fetchNewPosts(page = 1, forceRefresh = false) {
      // 如果不是强制刷新且已有数据且页码相同，直接返回
      if (!forceRefresh && this.newPosts.length > 0 && this.currentPage === page) {
        return
      }

      this.loading = true
      this.currentPage = page
      const offset = (page - 1) * this.pageSize

      await getNewestPost('', this.pageSize, offset)
        .then((response) => {
          if (response.results && response.results.list) {
            this.newPosts = response.results.list
            this.total = response.results.total || 0
            this.lastUpdated = new Date()
          }
        })
        .catch((err) => {
          console.error('获取最新写真失败:', err)
          throw err
        })
        .finally(() => {
          this.loading = false
        })
    },
  },

  // 持久化配置
  persist: {
    key: 'post-new-store',
    storage: localStorage,
    paths: ['currentPage'],
  },
})
