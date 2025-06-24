import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// 导入stores
import { useMangaDiscoverStore } from './manga-discover'
import { useMangaRankingStore } from './manga-ranking'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 导出stores
export {
    useMangaDiscoverStore,
    useMangaRankingStore
}

export default pinia