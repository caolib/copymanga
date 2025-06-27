import request from "@/utils/request";


// 获取公告（主页轮播图和公告）
function getNotice() {
    return request.get('/api/v3/system/config/2020/3', {
        params: { platform: 3 }
    })
}

export {
    getNotice
}