import request from '../utils/request'

/**
 * 获取写真首页信息
 * @returns 
 */
function getPostHome() {
    return request.get('/api/v3/h5/postIndex', {
        params: { platform: 3 }
    })
}


/**
 * 获取写真信息
 * @param {string} post_id 写真ID
 * @returns 
 */
function getPostInfo(post_id) {
    return request.get(`/api/v3/post/${post_id}`, {
        params: { platform: 3 }
    })
}

/**
 * 获取写真章节信息
 * @param {string} post_id 写真ID
 * @returns 
 */
function getPostId(post_id) {
    return request.get(`/api/v3/post/${post_id}/chapters`, {
        params: { limit: 500, offset: 0, platform: 3 }
    })
}

/**
 * 获取写真图片URL
 * @param {string} post_id 写真ID
 * @param {string} id 写真章节ID
 * @returns 
 */
function getPostImg(post_id, id) {
    return request.get(`/api/v3/post/${post_id}/chapter/${id}`, {
        params: { platform: 3 }
    })
}

export {
    getPostHome,
    getPostInfo,
    getPostId,
    getPostImg
}