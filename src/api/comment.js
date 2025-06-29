import request from '../utils/request'

/**
 * 获取章节评论
 * @param {string} chapterId 章节ID
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @returns {Promise} 评论数据
 */
function getChapterComments(chapterId, limit = 20, offset = 0) {
    return request.get('/api/v3/roasts', {
        params: {
            chapter_id: chapterId,
            limit,
            offset,
            _update: true
        }
    })
}

/**
 * 获取漫画评论
 * @param {string} comicId 漫画ID
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @returns {Promise} 评论数据
 */
function getMangaComments(comicId, limit = 10, offset = 0) {
    return request.get('/api/v3/comments', {
        params: {
            comic_id: comicId,
            reply_id: '',
            limit,
            offset,
        }
    })
}

/**
 * 发送漫画评论
 * @param {string} comicId 漫画ID
 * @param {string} comment 评论内容
 * @param {string} replyId 回复评论ID，默认为空
 * @returns {Promise} 评论发送结果
 */
function postMangaComment(comicId, comment, replyId = '') {
    const data = new URLSearchParams({
        comic_id: comicId,
        comment: comment,
        reply_id: replyId,
        platform: '3'
    })

    return request.post('/api/v3/member/comment', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
}

/**
 * 发送章节评论
 * @param {string} chapterId 章节ID
 * @param {string} roast 评论内容
 * @returns {Promise} 评论发送结果
 */
function postChapterComment(chapterId, roast) {
    const data = new URLSearchParams({
        chapter_id: chapterId,
        roast: roast,
        _update: 'true'
    })

    return request.post('/api/v3/member/roast', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
}

export {
    getChapterComments,
    getMangaComments,
    postMangaComment,
    postChapterComment
}

