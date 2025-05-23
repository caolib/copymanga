import request from '../utils/request'

/**
 * 获取章节评论
 * @param {string} chapterId 章节ID
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @returns {Promise} 评论数据
 */
function getChapterComments(chapterId, limit = 100, offset = 0) {
    return request.get('/api/v3/roasts', {
        params: {
            chapter_id: chapterId,
            limit,
            offset,
            _update: true
        }
    })
}

export {
    getChapterComments
}

