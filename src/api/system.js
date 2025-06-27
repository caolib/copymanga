import request from "@/utils/request";


/**
 * 获取官方公告
 * @returns {Promise} 返回公告数据
 */
function getNotice() {
    return request.get('/api/v3/system/config/2020/3', {
        params: { platform: 3 }
    })
}


/**
 * 获取官方APP应用版本信息
 * @returns {Promise} 返回应用版本信息
 */
function getAppVersion() {
    return request.get('/api/v3/system/appVersion/last', {
        params: { platform: 3 }
    })
}



export {
    getNotice,
    getAppVersion
}