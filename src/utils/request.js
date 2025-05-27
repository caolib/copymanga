import axios from 'axios'
import { getToken } from './auth'
import { message } from 'ant-design-vue'
import { getServerConfig } from './serverConfig'

// 根据环境变量选择后端服务器
const defaultBaseURL = 'http://localhost:5001/proxy'

// 创建 axios 实例
const request = axios.create({
    baseURL: defaultBaseURL,
    timeout: 30000,
    withCredentials: true
})

// 动态更新 baseURL
let configLoaded = false
let configLoadTime = 0
const CONFIG_CACHE_TIME = 5000 // 5秒缓存时间

const updateBaseURL = async () => {
    const now = Date.now()
    if (!configLoaded || (now - configLoadTime) > CONFIG_CACHE_TIME) {
        try {
            const config = await getServerConfig()
            request.defaults.baseURL = `${config.serverUrl}/proxy`
            configLoaded = true
            configLoadTime = now
        } catch (error) {
            console.warn('无法加载服务器配置，使用默认值:', error)
        }
    }
}

// 强制重新加载配置
export const reloadConfig = async () => {
    configLoaded = false
    configLoadTime = 0
    await updateBaseURL()
}

// 请求拦截器 TODO 区分那些请求不需要token
request.interceptors.request.use(
    async (config) => {
        // 确保 baseURL 已更新
        await updateBaseURL()

        // 添加认证令牌
        const token = getToken()
        if (token) {
            config.headers['Authorization'] = `Token ${token}`
        }

        // 添加通用请求头
        config.headers['Accept'] = '*/*'

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器 TODO 处理4xx等状态
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
        // 统一处理后端和网络异常
        let msg = '请求失败，请稍后重试'
        if (error.response && error.response.data) {
            if (error.response.data.detail) {
                msg = error.response.data.detail
            } else if (error.response.data.message) {
                msg = error.response.data.message
            }
        } else if (error.message) {
            msg = error.message
        }
        message.error(msg)
        return Promise.reject(error)
    }
)

export default request
