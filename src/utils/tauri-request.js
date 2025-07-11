import { fetch } from '@tauri-apps/plugin-http'
import { getRequestHeaders, getCurrentApiSource } from '@/config/server-config'
import { getCurrentDate } from '@/utils/date'
import { getToken } from '@/utils/auth'

class TauriHttpClient {
    constructor() {
        this.defaults = {
            baseURL: '',
            timeout: 30000,
            withCredentials: false,
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
     * 将对象转换为 URL 编码的表单数据字符串
     * @param {Object} obj 要转换的对象
     * @returns {string} URL编码的字符串
     */
    objectToFormUrlEncoded(obj) {
        return Object.keys(obj)
            .map(key => {
                const value = obj[key];
                if (value === undefined || value === null) {
                    return encodeURIComponent(key) + '=';
                }
                return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            })
            .join('&');
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
                timeout = this.defaults.timeout
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

            // 不使用 cookie
            if (this.defaults.withCredentials === false) {
                delete mergedHeaders.Cookie
                mergedHeaders['Cache-Control'] = 'no-cache'
            }

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

            // 处理请求体数据
            let bodyData = undefined;

            if (data) {
                // 处理URLSearchParams类型的数据
                if (data instanceof URLSearchParams) {
                    // 直接使用toString()方法获取URL编码的表单数据
                    bodyData = data.toString();

                    // 设置Content-Type为application/x-www-form-urlencoded
                    mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                // 处理FormData类型的数据
                else if (data instanceof FormData) {
                    // 将FormData转换为对象
                    const formDataObj = {};
                    for (const [key, value] of data.entries()) {
                        formDataObj[key] = value;
                    }

                    // 转换为URL编码的表单数据
                    bodyData = this.objectToFormUrlEncoded(formDataObj);

                    // 设置Content-Type为application/x-www-form-urlencoded
                    mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                // 处理application/x-www-form-urlencoded类型
                else if (mergedHeaders['Content-Type'] && mergedHeaders['Content-Type'].includes('application/x-www-form-urlencoded')) {
                    // 如果是对象，转换为URL编码的表单数据
                    if (typeof data === 'object' && data !== null) {
                        bodyData = this.objectToFormUrlEncoded(data);
                    } else {
                        // 如果是字符串（例如qs.stringify的结果），直接使用
                        bodyData = data;
                    }
                }
                // 处理字符串类型（可能是qs.stringify的结果）
                else if (typeof data === 'string') {
                    bodyData = data;

                    // 如果字符串看起来像URL编码的表单数据，设置相应的Content-Type
                    if (data.includes('=') && data.includes('&')) {
                        mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                    }
                }
                // 处理JSON类型
                else {
                    // 如果是对象，转换为JSON字符串
                    if (typeof data === 'object' && data !== null) {
                        bodyData = JSON.stringify(data);
                        // 如果没有设置Content-Type，默认设置为application/json
                        if (!mergedHeaders['Content-Type']) {
                            mergedHeaders['Content-Type'] = 'application/json';
                        }
                    } else {
                        bodyData = data;
                    }
                }
            }

            // console.log(`[Tauri HTTP] ${method} ${finalUrl}`, bodyData)
            // 调试：输出实际发送的头部
            console.log(`[Tauri HTTP] ${method} ${finalUrl}`)
            console.log('请求头:', mergedHeaders)

            // 发送请求
            const response = await fetch(finalUrl, {
                method,
                headers: mergedHeaders,
                body: bodyData,
                timeout
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