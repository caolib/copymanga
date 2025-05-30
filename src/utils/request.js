import axios from 'axios'
import { getToken } from './auth'
import { message } from 'ant-design-vue'
import { getServerConfig } from '@/config/server-config'
import router from '@/router'

// 创建 axios 实例
const request = axios.create({
    timeout: 60000,
    withCredentials: true
})

// 从配置文件读取baseURL
const updateBaseURL = async () => {
    await getServerConfig().then(config => {
        request.defaults.baseURL = `http://localhost:${config.serverPort}/proxy`
    }).catch(error => {
        console.error('获取服务器配置失败:', error)
        message.error('获取配置失败')
    })
}

// 前往登录
const goToLogin = () => {
    message.error('请先登录')
    router.push('/login')
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

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        if (response.status === 401) {
            goToLogin()
            return Promise.reject(new Error('未授权，请登录'))
        }
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

        // 处理401未授权错误，跳转到登录页面
        if (error.response && error.response.status === 401) {
            goToLogin()
            return Promise.reject(new Error('未授权，请登录'))
        }

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
