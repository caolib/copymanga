import axios from 'axios'
import { getToken } from './auth'
import { message } from 'ant-design-vue'

// 根据环境变量选择后端服务器
const defaultBaseURL = 'http://localhost:5001/proxy'

const request = axios.create({
    baseURL: defaultBaseURL,
    timeout: 30000,
    withCredentials: true
})

// 请求拦截器 TODO 区分那些请求不需要token
request.interceptors.request.use(
    (config) => {
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
        return Promise.reject(error)
    }
)

export default request
