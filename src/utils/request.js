import axios from 'axios'
import { getToken } from './auth'
import { message } from 'ant-design-vue'

// const isDev = import.meta.env.DEV
// const defaultBaseURL = isDev ? '' : 'https://www.copy20.com'
const defaultBaseURL = '/dev'
// const defaultBaseURL = 'https://www.copy20.com'

const request = axios.create({
    baseURL: defaultBaseURL,
    timeout: 60000 // 设置超时时间为 60000 毫秒 (60秒)
})

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        // 添加通用请求头
        config.headers = {
            ...config.headers,
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }

        // 添加认证令牌
        const token = getToken()
        if (token) {
            config.headers['Authorization'] = `Token ${token}`
        }

        // 移除浏览器不允许设置的不安全头，由代理服务器处理
        const unsafeHeaders = ['Referer', 'Origin', 'User-Agent']
        unsafeHeaders.forEach(header => {
            if (config.headers[header]) {
                console.warn(`尝试设置不安全头部 ${header}，已自动移除`)
                delete config.headers[header]
            }
        })

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        // 处理响应数据
        if (response.status === 500) {
            message.error('服务器错误，请稍后再试')
            return Promise.reject(new Error('请求失败'))
        }
        return response.data
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default request
