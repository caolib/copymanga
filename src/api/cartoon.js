import request from '../utils/request'

/**
 * 获取漫画首页数据
 * @param {number} limit - 页大小
 * @param {number} offset - 页码-1
 * @param {string} ordering - 排序方式 -datetime_updated 最新更新 -popular 热度
 * @param {string} theme - 主题
 * @return {Promise} - 返回漫画首页数据 /data/cartoon/动画首页.json
 */
function getCartoonHome(limit = 18, offset = 0, ordering = '-datetime_updated', theme = '') {
    return request.get('/api/v3/cartoons', {
        params: {
            free_type: 0,
            limit,
            offset,
            ordering,
            theme,
            platform: 3
        }
    })
}

/**
 * 获取漫画详情
 * @param {string} path_word - 漫画拼音
 * @return {Promise} - 返回漫画详情  /data/cartoon/动画详情.json
 */
function getCartoonInfo(path_word) {
    return request.get(`/api/v3/cartoon/${path_word}`, {
        params: {
            in_mainland: true,
            platform: 3
        }
    })
}

/**
 * 获取漫画章节列表
 * @param {string} path_word - 漫画拼音
 * @returns {Promise} - 返回漫画章节列表 /data/cartoon/动画章节列表.json
 */
function getCartoonChapters(path_word) {
    return request.get(`/api/v3/cartoon/${path_word}/chapters`, {
        params: {
            platform: 3
        }
    })
}

/**
 * 获取视频
 * @param {*} path_word 动画拼音
 * @param {*} chapter_id 动画id
 * @param {*} line 线路
 * @returns {Promise} - 返回视频数据 /data/cartoon/动画视频.json
 */
function getVideoByChapterId(path_word, chapter_id, line) {
    return request.get(`/api/v3/cartoon/${path_word}/chapter/${chapter_id}`, {
        params: {
            line,
            platform: 3
        }
    })
}


export {
    getCartoonHome,
    getCartoonInfo,
    getCartoonChapters,
    getVideoByChapterId
}