import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// 导入manga-discover store
import { useMangaDiscoverStore } from './manga-discover'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 导出manga-discover store
export { useMangaDiscoverStore }

export default pinia