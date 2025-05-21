import { defineStore } from 'pinia'
import { getMyCollection } from '../api/manga'

export const useCollectionStore = defineStore('collection', {
    state: () => ({
        mangaList: [],
        loading: false,
        error: '',
        lastUpdateTime: null
    }),    actions: {
        fetchCollection() {
            if (this.loading) return Promise.resolve()

            this.loading = true
            this.error = ''
            
            return getMyCollection()
                .then(result => {
                    if (result && result.results && result.results.list) {
                        this.mangaList = result.results.list
                        this.lastUpdateTime = new Date().toISOString()
                    } else {
                        throw new Error('获取数据格式错误')
                    }
                    return result
                })
                .catch(error => {
                    console.error('获取书架失败:', error)
                    this.error = error.message || '获取书架失败'
                    throw error
                })
                .finally(() => {
                    this.loading = false
                })
        }    },

    persist: {
        enabled: true,
        strategies: [
            {
                key: 'copymanga-collection',
                storage: localStorage,
                paths: ['mangaList', 'lastUpdateTime']
            }
        ]
    }
})