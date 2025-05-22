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
        // 添加认证令牌
        const token = getToken()
        if (token) {
            config.headers['Authorization'] = `Token ${token}`
        }

        // 添加通用请求头
        config.headers['Accept'] = 'application/json, text/plain, */*'
        config.headers['Cache-Control'] = 'no-cache'
        config.headers['Pragma'] = 'no-cache'

        // 注意：不要直接设置Cookie头，浏览器会自动处理
        // Cookie将由浏览器自动添加，或由Vite代理服务器处理

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
