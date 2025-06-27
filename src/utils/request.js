import axios from 'axios'
import { getToken } from './auth'
import { message } from 'ant-design-vue'
import { getServerConfig } from '@/config/server-config'
import router from '@/router'
import { getCurrentDate } from './date'
import { notification } from 'ant-design-vue'

// 创建 axios 实例
const request = axios.create({
    timeout: 30000,
    withCredentials: true
})

// 从配置文件读取baseURL
const updateBaseURL = async () => {
    await getServerConfig().then(config => {
        request.defaults.baseURL = `http://localhost:${config.serverPort}/proxy`
    })
}

// 前往登录
const goToLogin = () => {
    message.error('未登录或身份过期，请重新登录')
    router.push('/login')
}

// 不需要token的路径列表
const noTokenPaths = [
    '/login',
    '/register',
    '/system/network2',
    '/h5/homeIndex',
    '/update/newest'
]

// 根据请求路径决定是否返回token
const getTokenByPath = (url) => {
    if (!url) return getToken()

    // 提取路径部分，去除查询参数
    const pathPart = url.split('?')[0]

    // 检查路径是否以指定路径结尾
    if (noTokenPaths.some(path => pathPart.endsWith(path))) {
        return ''
    }
    return getToken()
}

// 请求拦截器
request.interceptors.request.use(
    async (config) => {
        // 确保 baseURL 已更新
        await updateBaseURL()

        // 添加认证令牌，根据路径判断
        const token = getTokenByPath(config.url)
        config.headers['Authorization'] = `Token ${token}`


        // 动态生成 dt 字段 (日期)
        config.headers['dt'] = getCurrentDate()

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        if (response.status === 401 || response.data.code === 401) {
            goToLogin()
            return Promise.reject(new Error('请重新登录'))
        }
        // 处理响应数据
        if (response.status === 500) {
            console.error('服务器错误，请稍后再试')
            return Promise.reject(new Error('请求失败'))
        }

        if (response.status === 210) {
            if (response.data.message.includes('破解')) {
                notification.warn({
                    message: '账号暂时封禁，建议先切换其他账号或者退出重新登录',
                    description: response.data.message,
                    placement: 'bottomRight',
                    duration: null,
                })
                router.push('/settings')
                return Promise.reject(new Error('需要配置请求头'))
            }
        }

        return response.data
    },
    (error) => {
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
        message.error({
            content: () => msg,
            class: 'custom-msg-btn'
        });
        return Promise.reject(error)
    }
)

export default request
