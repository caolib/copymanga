import request from '../utils/request'

/**
 * 获取个人书架
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @param {number} freeType 免费类型
 * @returns {Promise} 书架数据
 */
export function getMyCollection(limit = 20, offset = 0, freeType = 1) {
    return request.get('/proxy/api/v3/member/collect/comics', {
        params: {
            limit,
            offset,
            free_type: freeType,
            ordering: '-datetime_updated'
        },
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
        }
    })
}


/**
 * 获取漫画章节列表
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise} 漫画章节数据
 */
export function getMangaChapters(pathWord) {
    return request.get(`/proxy/comicdetail/${pathWord}/chapters`, {
        headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
    })
}

/**
 * 获取漫画章节图片
 * @param {string} pathWord 漫画路径标识
 * @param {string} chapterId 章节ID
 * @returns {Promise} 章节图片数据
 */
export function getChapterImages(pathWord, chapterId) {
    return request.get(`/proxy/api/v3/comic/${pathWord}/chapter/${chapterId}`, {
        headers: {
            'Accept': '*/*'
        }
    })
}

/**
 * 获取章节评论
 * @param {string} chapterId 章节ID
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @returns {Promise} 评论数据
 */
export function getChapterComments(chapterId, limit = 100, offset = 0) {
    return request.get('/proxy/api/v3/roasts', {
        params: {
            chapter_id: chapterId,
            limit,
            offset,
            _update: true
        }
    })
}
