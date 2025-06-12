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


/**
 * 写真-发现
 * @param {*} mannequin 模特
 * @param {*} tag 标签
 * @param {*} ordering 排序 -datetime_updated：最近更新 -popular：热度
 * @param {*} limit 页大小
 * @param {*} offset 页码-1
 * @returns 
 */
function discoverPost(mannequin = '', tag = '', ordering = '-datetime_updated', limit = 18, offset = 0) {
    return request.get('/api/v3/posts', {
        params: {
            mannequin,
            tag,
            ordering,
            limit,
            offset,
            platform: 3
        }
    })
}


/**
 * 获取最新写真信息
 * @param {*} date 日期
 * @param {*} limit 页大小
 * @param {*} offset 页码-1
 * @returns 
 */
function getNewestPost(date = '', limit = 18, offset = 0) {
    return request.get('/api/v3/update/post/newest', {
        params: {
            date,
            limit,
            offset,
            platform: 3
        }
    })
}

/**
 * 获取排行榜信息
 * @param {*} type 类型 - 6: 写真
 * @param {*} date_type 日期类型 - week: 周榜 - month: 月榜 - total: 总榜
 * @param {*} limit 页大小
 * @param {*} offset 页码-1
 * @param {*} audience 受众类型 - male: 男性
 * @returns 
 */
function getPostRank(type = 6, date_type, limit = 18, offset = 0, audience = 'male') {
    return request.get('/api/v3/ranks', {
        params: {
            type,
            date_type,
            limit,
            offset,
            audience,
            platform: 3
        }
    })
}

/**
 * 获取用户收藏的写真列表
 * @param {*} offset 
 * @param {*} limit 
 * @param {*} free_type 
 * @param {*} ordering -datetime_updated: 最近更新 -datetime_modifier: 最近加入书架时间 -datetime_browse: 最近浏览时间
 * @returns 
 */
function getPostCollection(offset = 0, limit = 10, free_type = 1, ordering = '-datetime_updated') {
    return request.get('/api/v3/member/collect/posts', {
        params: {
            limit,
            offset,
            free_type,
            ordering,
            platform: 3
        }
    })
}

/**
 * 收藏或取消收藏写真
 * @param {*} post_id 写真ID
 * @param {*} isCollect 是否收藏    
 * @returns 
 */
function collectPost(post_id, isCollect = true) {
    const data = new URLSearchParams();
    data.append('post_id', post_id);
    data.append('is_collect', isCollect ? '1' : '0');
    return request.post('/api/v3/member/collect/post', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
    });
}

export {
    getPostHome,
    getPostInfo,
    getPostId,
    getPostImg,
    discoverPost,
    getNewestPost,
    getPostRank,
    getPostCollection,
    collectPost
}