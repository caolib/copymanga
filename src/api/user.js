import request from '../utils/request'

/**
 * 获取用户信息
 * @returns {Promise} 用户信息
 */
export function getUserInfo() {
    return request.get('/api/v2/web/user/info', {
        headers: {
            'Content-Encoding': 'gzip, compress, br',
            'platform': '2',
        }
    })
}

/**
 * 更新用户信息
 * @param {Object} userInfo 用户信息
 * @returns {Promise} 更新结果
 */
export function updateUserInfo(userInfo) {
    return request.post('/api/v2/web/user/update', userInfo, {
        headers: {
            'platform': '2',
        }
    })
}

/**
 * 上传用户头像
 * @param {File} file 头像文件
 * @returns {Promise} 上传结果
 */
export function uploadAvatar(file) {
    const formData = new FormData()
    formData.append('avatar', file)

    return request.post('/api/v2/web/user/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            'platform': '2',
        }
    })
}