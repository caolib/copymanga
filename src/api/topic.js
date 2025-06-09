import request from '../utils/request'

/**
 * 获取话题详情
 * @param {string} topicId 话题ID
 * @returns 
 */
function getTopicInfo(topicId) {
    return request.get(`/api/v3/topic/${topicId}`, {
        params: { platform: 3 }
    })
}

/**
 * 获取话题内容
 * @param {string} topicId 话题ID
 * @param {number} type 内容类型
 * @param {number} offset 页码-1
 * @param {number} limit 页数量
 * @returns 
 */
function getTopicContent(topicId, type, offset = 0, limit = 25) {
    return request.get(`/api/v3/topic/${topicId}/contents`, {
        params: {
            type,
            limit,
            offset,
            platform: 3
        }
    })
}

export {
    getTopicContent,
    getTopicInfo
}