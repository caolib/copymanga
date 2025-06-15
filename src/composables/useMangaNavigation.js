import { useRouter } from 'vue-router'
import { useMangaStore } from '@/stores/manga'

/**
 * 漫画导航 composable
 * 提供统一的漫画跳转逻辑
 */
export function useMangaNavigation() {
    const router = useRouter()
    const mangaStore = useMangaStore()    /**
     * 跳转到漫画详情页
     * @param {Object} manga 漫画对象
     * @param {Object} options 跳转选项
     * @param {Object} options.query 额外的查询参数
     * @param {string} options.from 来源页面标识
     */
    const goToMangaDetail = (manga, options = {}) => {
        if (!manga || !manga.path_word) {
            console.error('漫画数据无效:', manga)
            return
        }

        // console.log('跳转到漫画详情:', manga.name)

        // 设置当前漫画到 store
        mangaStore.setCurrentManga(manga)

        // 构建路由参数
        const routeParams = {
            name: 'MangaDetail',
            params: { pathWord: manga.path_word }
        }

        // 如果有额外的查询参数，添加到路由中
        if (options.query) {
            routeParams.query = options.query
        }

        // 跳转到详情页
        router.push(routeParams)
    }

    /**
     * 跳转到作者漫画列表页
     * @param {Object} author 作者对象
     */
    const goToAuthorMangaList = (author) => {
        if (!author || !author.path_word) {
            console.error('作者数据无效:', author)
            return
        }

        router.push({
            name: 'AuthorMangaList',
            params: { pathWord: author.path_word }
        })
    }

    return {
        goToMangaDetail,
        goToAuthorMangaList
    }
}
