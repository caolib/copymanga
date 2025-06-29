// 导入tauri提供的fetch API
// 这个文件专门用于使用tauri的HTTP客户端发送请求，区别于axios请求
import { fetch } from '@tauri-apps/plugin-http'
import { getRequestHeaders, getCurrentApiSource } from '@/config/server-config'
import { getCurrentDate } from '@/utils/date'
import { getToken } from '@/utils/auth'

/**
 * 统一的请求工具函数，类似请求拦截器
 * @param {string} url API路径，不包含域名
 * @param {Object} options 请求选项，如method, params等
 * @returns {Promise<any>} 请求结果
 */
async function request(url, options = {}) {
    try {
        // 获取API域名
        const apiDomain = await getCurrentApiSource()
        console.log('当前API域名:', apiDomain)

        if (!apiDomain) {
            throw new Error('未配置API域名')
        }

        // 获取请求头
        const baseHeaders = await getRequestHeaders()
        console.log('基础请求头:', baseHeaders)

        // 复制请求头并添加时间戳
        const headers = { ...baseHeaders }
        headers.dt = getCurrentDate()
        console.log('添加时间戳:', headers.dt)

        // 不需要token的路径列表
        const noTokenPaths = [
            '/login',
            '/register',
            '/system/network2',
            '/h5/homeIndex',
            '/update/newest'
        ]

        // 如果不是无token路径，则添加token
        if (!noTokenPaths.some(path => url.includes(path))) {
            const token = getToken()
            console.log('添加Token:', token ? '已设置' : '未设置')
            headers.Authorization = `Token ${token}`
        } else {
            console.log('不需要Token的路径:', url)
        }

        // 处理参数
        const { method = 'GET', params = {}, body } = options
        let fullUrl = `${apiDomain}${url}`

        // 如果是GET请求且有参数，添加到URL中
        if (method === 'GET' && Object.keys(params).length > 0) {
            const urlObj = new URL(fullUrl)
            Object.entries(params).forEach(([key, value]) => {
                urlObj.searchParams.append(key, value)
            })
            fullUrl = urlObj.toString()
        }

        console.log('请求URL:', fullUrl)
        console.log('请求头:', headers)

        // 发送请求
        const response = await fetch(fullUrl, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            unsafeSend: true
        })

        console.log('响应状态:', response.status, response.statusText)

        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态: ${response.status}`)
        }

        const data = await response.json()
        console.log('响应数据:', data)
        return data
    } catch (error) {
        console.error(`请求失败: ${url}`, error)
        throw error
    }
}

/**
 * 获取漫画首页数据
 * @returns {Promise} 首页数据
 */
async function getHomeIndex() {
    try {
        console.log('开始获取首页数据')
        return await request('/api/v3/h5/homeIndex')
    } catch (error) {
        console.error('获取漫画首页数据失败:', error)
        throw error
    }
}

/**
 * 获取最新上架漫画
 * @param {string} date 日期，格式为YYYY-MM-DD，默认为当前日期
 * @param {number} limit 每页数量，默认18
 * @param {number} offset 偏移量，默认0
 * @returns {Promise} 最新漫画数据
 */
async function getNewestManga(date = '', limit = 18, offset = 0) {
    try {
        console.log('开始获取最新漫画数据')
        return await request('/api/v3/update/newest', {
            params: {
                date,
                limit,
                offset,
                platform: 3
            }
        })
    } catch (error) {
        console.error('获取最新漫画数据失败:', error)
        throw error
    }
}

/**
 * 获取漫画详情
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise} 漫画详情数据
 */
async function getMangaDetail(pathWord) {
    try {
        console.log('开始获取漫画详情')
        return await request(`/api/v3/comic2/${pathWord}`, {
            params: {
                platform: 3
            }
        })
    } catch (error) {
        console.error('获取漫画详情失败:', error)
        throw error
    }
}

export {
    getHomeIndex,
    getNewestManga,
    getMangaDetail
}
