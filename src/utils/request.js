import tauriRequest from './tauri-request'
import { message } from 'ant-design-vue'
import router from '@/router'
import { notification } from 'ant-design-vue'

// 创建请求实例
const request = tauriRequest.create({
    timeout: 30000,
    withCredentials: false
})

// 前往登录
const goToLogin = () => {
    message.error('未登录或身份过期，请重新登录')
    router.push('/login')
}

// 响应处理函数，保持与之前相同的逻辑
const handleResponse = (response) => {
    // console.log('Response:', response)
    // 处理响应数据
    if (response.code === 401) {
        goToLogin()
        return Promise.reject(new Error('请重新登录'))
    }

    if (response.code === 500) {
        console.error('服务器错误，请稍后再试')
        return Promise.reject(new Error('请求失败'))
    }

    if (response.code === 210) {
        console.error(response.message)
        if (response.message && response.message.includes('破解')) {
            notification.warn({
                message: '不妙，账号暂时被封了！',
                description: response.message,
                placement: 'bottomRight',
                duration: 5,
            })
            router.push('/login')
            return Promise.reject()
        }
    }

    return response
}

// 错误处理函数，保持与之前相同的逻辑
const handleError = (error) => {
    console.log(JSON.stringify(error))
    // 统一处理后端和网络异常
    let msg = '请求失败，请稍后重试'

    // 处理401未授权错误，跳转到登录页面
    if (error.response && error.response.status === 401) {
        goToLogin()
        return Promise.reject(new Error('请重新登录'))
    }

    if (error.code === 'ECONNABORTED') {
        msg = '请求超时，请检查网络连接或稍后重试'
    }

    if (error.code === 'ERR_NETWORK') {
        msg = '好像没连上网喔...'
    }

    if (error.code === "ECONNABORTED") {
        msg = '请求超时，请稍后再试'
    }

    console.error(error)
    if (msg !== '请求失败，请稍后重试') {
        message.error({
            content: () => msg,
            class: 'custom-msg-btn'
        });
    }
    return Promise.reject(error)
}

// 重写请求方法，添加响应处理
const originalRequest = request.request.bind(request)
request.request = async function (config) {
    try {
        const response = await originalRequest(config)
        return handleResponse(response)
    } catch (error) {
        return handleError(error)
    }
}

// 重写get方法
const originalGet = request.get.bind(request)
request.get = async function (url, config) {
    try {
        const response = await originalGet(url, config)
        return handleResponse(response)
    } catch (error) {
        return handleError(error)
    }
}

// 重写post方法
const originalPost = request.post.bind(request)
request.post = async function (url, data, config) {
    try {
        const response = await originalPost(url, data, config)
        return handleResponse(response)
    } catch (error) {
        return handleError(error)
    }
}


export default request
