import { defineStore } from 'pinia'
import { useMangaStore } from './manga'

export const useCollectionStore = defineStore('collection', {
    state: () => ({
        mangaList: [],
        loading: false,
        error: '',
        lastUpdateTime: null
    }),

    actions: {
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