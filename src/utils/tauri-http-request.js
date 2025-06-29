// 使用Tauri HTTP插件，替代axios
import { fetch } from '@tauri-apps/plugin-http'
import { getRequestHeaders, getCurrentApiSource } from '@/config/server-config'
import { getCurrentDate } from '@/utils/date'
import { getToken } from '@/utils/auth'

/**
 * 创建一个类似axios的请求工具
 */
class TauriHttpClient {
    constructor() {
        this.defaults = {
            baseURL: '',
            timeout: 30000,
            withCredentials: true,
            headers: {}
        }

        // 不需要token的路径列表
        this.noTokenPaths = [
            '/login',
            '/register',
            '/system/network2',
            '/h5/homeIndex',
            '/update/newest'
        ]
    }

    /**
     * 通用请求方法
     * @param {Object} config 请求配置
     * @returns {Promise<any>} 响应数据
     */
    async request(config) {
        try {
            const {
                method = 'GET',
                url,
                params = {},
                data,
                headers = {},
                baseURL = this.defaults.baseURL
            } = config

            // 检查URL是否包含/proxy/，如果包含则需要转换为直接API源URL
            let finalUrl = url
            let apiDomain = ''

            // 如果URL包含/proxy/，则需要转换
            if (url.includes('/proxy/')) {
                // 从URL中提取实际路径
                const pathParts = url.split('/proxy')
                const actualPath = pathParts[1] || ''

                // 获取API域名
                apiDomain = await getCurrentApiSource()
                // console.log('转换代理URL为API源URL，当前API域名:', apiDomain)

                if (!apiDomain) {
                    throw new Error('未配置API域名')
                }

                // 构建最终URL
                finalUrl = `${apiDomain}${actualPath}`
                // console.log('转换后的URL:', finalUrl)
            }
            // 如果URL不包含http，则需要添加API域名
            else if (!url.startsWith('http')) {
                // 获取API域名
                apiDomain = await getCurrentApiSource()
                // console.log('当前API域名:', apiDomain)

                if (!apiDomain) {
                    throw new Error('未配置API域名')
                }

                // 构建最终URL
                finalUrl = `${apiDomain}${url}`
            }

            // 获取请求头
            const baseHeaders = await getRequestHeaders()

            // 合并默认请求头和传入的请求头
            const mergedHeaders = {
                ...baseHeaders,
                ...this.defaults.headers,
                ...headers
            }

            // 添加时间戳
            mergedHeaders.dt = getCurrentDate()

            // 如果不是无token路径，则添加token
            if (!this.noTokenPaths.some(path => url.includes(path))) {
                const token = getToken()
                if (token) {
                    mergedHeaders.Authorization = `Token ${token}`
                }
            }

            // 处理GET请求的参数
            if (method === 'GET' && Object.keys(params).length > 0) {
                const urlObj = new URL(finalUrl)
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        urlObj.searchParams.append(key, value)
                    }
                })
                finalUrl = urlObj.toString()
            }

            // console.log(`[Tauri HTTP] ${method} ${finalUrl}`)

            // 发送请求
            const response = await fetch(finalUrl, {
                method,
                headers: mergedHeaders,
                body: data ? JSON.stringify(data) : undefined,
                unsafeSend: true
            })

            if (!response.ok) {
                throw {
                    response: {
                        status: response.status,
                        data: await response.json().catch(() => ({}))
                    },
                    message: `HTTP Error ${response.status}`
                }
            }

            // 解析JSON响应
            const responseData = await response.json()

            // 构造类似axios的响应对象
            return {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config
            }
        } catch (error) {
            console.error('[Tauri HTTP Error]', error)
            throw error
        }
    }

    /**
     * GET请求
     * @param {string} url 请求URL
     * @param {Object} config 请求配置
     * @returns {Promise<any>} 响应数据
     */
    async get(url, config = {}) {
        const response = await this.request({
            ...config,
            method: 'GET',
            url
        })
        return response.data
    }

    /**
     * POST请求
     * @param {string} url 请求URL
     * @param {any} data 请求数据
     * @param {Object} config 请求配置
     * @returns {Promise<any>} 响应数据
     */
    async post(url, data, config = {}) {
        const response = await this.request({
            ...config,
            method: 'POST',
            url,
            data
        })
        return response.data
    }

    /**
     * PUT请求
     * @param {string} url 请求URL
     * @param {any} data 请求数据
     * @param {Object} config 请求配置
     * @returns {Promise<any>} 响应数据
     */
    async put(url, data, config = {}) {
        const response = await this.request({
            ...config,
            method: 'PUT',
            url,
            data
        })
        return response.data
    }

    /**
     * DELETE请求
     * @param {string} url 请求URL
     * @param {Object} config 请求配置
     * @returns {Promise<any>} 响应数据
     */
    async delete(url, config = {}) {
        const response = await this.request({
            ...config,
            method: 'DELETE',
            url
        })
        return response.data
    }

    // 创建实例方法（类似axios.create）
    create(config) {
        const instance = new TauriHttpClient()
        instance.defaults = { ...this.defaults, ...config }
        return instance
    }
}

// 创建并导出默认实例
const request = new TauriHttpClient()

export default request 