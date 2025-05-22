import { defineStore } from 'pinia'
import { getMyCollection } from '../api/manga'
import { useMangaStore } from './manga'

export const useCollectionStore = defineStore('collection', {
    state: () => ({
        mangaList: [],
        loading: false,
        error: '',
        lastUpdateTime: null
    }),    
    
    actions: {
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
        },

        /**
         * 设置当前漫画信息到 mangaStore 中
         * @param {Object} manga 漫画信息
         */
        setCurrentManga(manga) {
            const mangaStore = useMangaStore()
            mangaStore.setCurrentManga(manga)
            
            // 如果有 path_word，也设置它
            if (manga.path_word) {
                mangaStore.pathWord = manga.path_word
            }
        }
    },

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