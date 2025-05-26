import request from '../utils/request'

// 获取用户浏览记录
export function getUserBrowseList(limit = 18, offset = 0, freeType = 1) {
    return request.get('/api/kb/web/browses', {
        params: { limit, offset, free_type: freeType },
        headers: {
            'Content-Encoding': 'gzip, compress, br',
            'platform': '2',
        },
    })
} 