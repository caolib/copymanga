import router from "."
import { useMangaStore } from "@/stores/manga"

const mangaStore = useMangaStore()


/**
 * 跳转到漫画详情页
 * @param {*} item 漫画
 */
const goToMangaDetail = (item) => {
    mangaStore.setCurrentManga(item)
    router.push(`/manga/${item.path_word}`)
}

export {
    goToMangaDetail
}