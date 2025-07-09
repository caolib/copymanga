import { useMangaNavigation } from '@/composables/useMangaNavigation.js'
import { useRouter } from 'vue-router'

/**
 * 漫画卡片点击处理 composable
 * 提供统一的漫画卡片点击逻辑
 */
export function useMangaCardClick() {
    const { goToMangaDetail } = useMangaNavigation()
    const router = useRouter()

    /**
     * 处理漫画卡片点击
     * @param {Object} params 参数对象
     * @param {Object} params.manga 漫画数据
     * @param {Object} params.item 原始数据项（可能包含额外信息）
     * @param {string} params.clickType 点击类型
     */
    const handleMangaCardClick = ({ manga, item, clickType }) => {
        switch (clickType) {
            case 'online':
                // 在线漫画：跳转到在线漫画详情页
                goToMangaDetail(manga)
                break

            case 'local':
                // 本地漫画：跳转到本地漫画详情页
                if (manga.uuid || item?.uuid) {
                    router.push(`/localmanga/${manga.uuid || item.uuid}`)
                } else {
                    console.error('本地漫画缺少 uuid:', manga, item)
                }
                break

            case 'collection':
                // 收藏漫画：根据数据类型决定跳转
                if (item?.comic) {
                    // 收藏的在线漫画
                    goToMangaDetail(item.comic)
                } else if (manga) {
                    // 直接的漫画对象
                    goToMangaDetail(manga)
                } else {
                    console.error('收藏漫画数据格式错误:', manga, item)
                }
                break

            case 'author':
                // 作者漫画列表：使用 path_word 跳转
                if (manga.path_word) {
                    router.push(`/manga/${manga.path_word}`)
                } else {
                    console.error('作者漫画缺少 path_word:', manga)
                }
                break

            case 'search':
                // 搜索结果：直接跳转
                goToMangaDetail(manga)
                break

            case 'topic':
                // 专题漫画：跳转到详情页
                goToMangaDetail(manga)
                break

            case 'ranking':
                // 排行榜：可能需要特殊处理
                if (item?.comic) {
                    goToMangaDetail(item.comic)
                } else {
                    goToMangaDetail(manga)
                }
                break

            case 'custom':
                // 自定义：由组件自己处理
                console.log('自定义点击类型，需要组件自己处理')
                break

            default:
                console.warn('未知的点击类型:', clickType)
                // 默认使用在线漫画逻辑
                goToMangaDetail(manga)
        }
    }

    return {
        handleMangaCardClick
    }
}
