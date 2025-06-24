import request from '@/utils/request'

/**
 * 获取官方API源
 * @returns {Promise} 包含API源列表的Promise
 */
function getOfficialApiSources() {
    return request.get('/api/v3/system/network2', {
        params: {
            platform: 3
        }
    }).then(response => {
        if (response && response.code === 200 && response.results) {
            // 从响应中提取API源列表
            const apiSources = []

            // 处理API源列表，格式为 [["api.example.com"], ["api2.example.com"]]
            if (response.results.api && Array.isArray(response.results.api)) {
                response.results.api.forEach(apiGroup => {
                    if (Array.isArray(apiGroup) && apiGroup.length > 0) {
                        // 遍历每个API组中的每个API
                        apiGroup.forEach(api => {
                            if (api && typeof api === 'string') {
                                // 添加https协议前缀
                                const apiUrl = api.startsWith('http') ? api : `https://${api}`
                                if (!apiSources.includes(apiUrl)) {
                                    apiSources.push(apiUrl)
                                }
                            }
                        })
                    }
                })
            }

            // 处理share字段中的API源
            if (response.results.share && Array.isArray(response.results.share)) {
                response.results.share.forEach(share => {
                    if (share && typeof share === 'string') {
                        // 添加https协议前缀
                        const shareUrl = share.startsWith('http') ? share : `https://${share}`
                        if (!apiSources.includes(shareUrl)) {
                            apiSources.push(shareUrl)
                        }
                    }
                })
            }

            console.log('获取到的官方API源:', apiSources)
            return apiSources
        } else {
            throw new Error('获取官方API源失败：服务器返回错误响应')
        }
    })
}

export {
    getOfficialApiSources
} 