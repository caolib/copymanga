import request from '../utils/request'

/**
 * 获取用户信息 - APP版本
 * @returns {Promise} 用户信息
 */
function getUserInfo() {
    return request.get('/api/v3/member/info', {
        params: {
            platform: '3'
        }
    })
}

/**
 * 获取漫画浏览记录
 * @param {number} offset 偏移量，默认0
 * @param {number} limit 限制数量，默认18
 * @returns {Promise} 漫画浏览记录列表
 */
function getBrowseComics(offset = 0, limit = 18) {
    return request.get('/api/v3/member/browse/comics', {
        params: {
            offset,
            limit,
            platform: '3'
        }
    })
}

/**
 * 获取轻小说浏览记录
 * @param {number} offset 偏移量，默认0
 * @param {number} limit 限制数量，默认18
 * @returns {Promise} 轻小说浏览记录列表
 */
function getBrowseBooks(offset = 0, limit = 18) {
    return request.get('/api/v3/member/browse/books', {
        params: {
            offset,
            limit,
            platform: '3'
        }
    })
}

/**
 * 获取写真浏览记录
 * @param {number} offset 偏移量，默认0
 * @param {number} limit 限制数量，默认18
 * @returns {Promise} 写真浏览记录列表
 */
function getBrowsePosts(offset = 0, limit = 18) {
    return request.get('/api/v3/member/browse/posts', {
        params: {
            offset,
            limit,
            platform: '3'
        }
    })
}

/**
 * 获取动画浏览记录
 * @param {number} offset 偏移量，默认0
 * @param {number} limit 限制数量，默认18
 * @returns {Promise} 动画浏览记录列表
 */
function getBrowseCartoons(offset = 0, limit = 18) {
    return request.get('/api/v3/member/browse/cartoons', {
        params: {
            offset,
            limit,
            platform: '3'
        }
    })
}

export {
    getUserInfo,
    getBrowseComics,
    getBrowseBooks,
    getBrowsePosts,
    getBrowseCartoons
}