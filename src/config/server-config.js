import { pathHelper, CONFIG_FILES } from '@/utils/path-helper'

const DEFAULT_SERVER_PORT = '5001'

// 默认请求头配置
const DEFAULT_REQUEST_HEADERS = {
    source: 'copyApp',
    deviceinfo: 'PGEM10-star2qltechn',
    webp: '1',
    platform: '3',
    version: '2.3.0',
    region: '1',
    device: 'PQ3B.190801.05281406',
    umstring: 'b4c89ca4104ea9a97750314d791520ac'
}

// 读取服务器配置
export async function getServerConfig() {
    const config = await pathHelper.readConfig(CONFIG_FILES.SERVER, {
        serverPort: DEFAULT_SERVER_PORT
    })

    const port = config.serverPort || DEFAULT_SERVER_PORT
    return {
        serverPort: port,
        serverUrl: `http://localhost:${port}`
    }
}

// 读取应用配置
export async function getAppConfig() {
    const config = await pathHelper.readConfig(CONFIG_FILES.APP, {
        apiSources: [],
        currentApiIndex: -1,
        bookApiSources: [],
        currentBookApiIndex: -1,
        requestHeaders: DEFAULT_REQUEST_HEADERS
    })

    // 确保配置包含所有必要字段
    const result = {
        apiSources: config.apiSources || [],
        currentApiIndex: config.currentApiIndex || -1,
        bookApiSources: config.bookApiSources || [],
        currentBookApiIndex: config.currentBookApiIndex || -1,
        requestHeaders: { ...DEFAULT_REQUEST_HEADERS, ...(config.requestHeaders || {}) }
    }

    // 如果当前索引超出范围，重置为-1
    if (result.currentApiIndex >= result.apiSources.length || result.currentApiIndex < -1) {
        result.currentApiIndex = -1
    }

    if (result.currentBookApiIndex >= result.bookApiSources.length || result.currentBookApiIndex < -1) {
        result.currentBookApiIndex = -1
    }

    return result
}

// 保存服务器配置
export async function saveServerConfig(serverPort) {
    return await pathHelper.saveConfig(CONFIG_FILES.SERVER, { serverPort })
}

// 保存应用配置
export async function saveAppConfig(config) {
    return await pathHelper.saveConfig(CONFIG_FILES.APP, config)
}

// 验证端口号格式
export function validateServerPort(port) {
    const portNum = parseInt(port)
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535
}

// 验证域名格式
export function validateApiDomain(domain) {
    try {
        const url = new URL(domain)
        return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
        return false
    }
}

// 添加新的API源
export async function addApiSource(url) {
    if (!url) {
        throw new Error('URL不能为空')
    }

    if (!validateApiDomain(url)) {
        throw new Error('无效的URL格式')
    }

    const config = await getAppConfig()

    // 检查是否已存在相同的URL
    const exists = config.apiSources.some(source => source === url)
    if (exists) {
        throw new Error('该API源已存在')
    }

    config.apiSources.push(url)
    await saveAppConfig(config)
    return true
}

// 删除API源
export async function removeApiSource(index) {
    const config = await getAppConfig()

    if (index < 0 || index >= config.apiSources.length) {
        throw new Error('无效的索引')
    }

    // 不能删除所有源
    if (config.apiSources.length <= 1) {
        throw new Error('至少需要保留一个API源')
    }

    config.apiSources.splice(index, 1)

    // 如果删除的是当前使用的源，切换到第一个
    if (config.currentApiIndex === index) {
        config.currentApiIndex = 0
    } else if (config.currentApiIndex > index) {
        // 如果删除的源在当前源之前，需要调整索引
        config.currentApiIndex = config.currentApiIndex - 1
    }

    // 确保索引在有效范围内
    if (config.currentApiIndex >= config.apiSources.length) {
        config.currentApiIndex = config.apiSources.length - 1
    }

    await saveAppConfig(config)
    return true
}

// 切换API源
export async function switchApiSource(index) {
    const config = await getAppConfig()

    if (index < 0 || index >= config.apiSources.length) {
        throw new Error('无效的索引')
    }

    config.currentApiIndex = index
    await saveAppConfig(config)
    return config.apiSources[index]
}

// 获取当前API源
export async function getCurrentApiSource() {
    const config = await getAppConfig()

    if (config.apiSources.length === 0 || config.currentApiIndex < 0) {
        return null
    }

    if (config.currentApiIndex >= config.apiSources.length) {
        // 如果索引超出范围，使用第一个源
        return config.apiSources[0]
    }

    return config.apiSources[config.currentApiIndex]
}

// 获取当前API域名
export async function getCurrentApiDomain() {
    const currentSource = await getCurrentApiSource()
    return currentSource || null
}

// 获取所有API源
export async function getApiSources() {
    const config = await getAppConfig()
    return config.apiSources || []
}

// 验证API源配置
export async function validateApiConfig() {
    const config = await getAppConfig()

    // 检查是否有API源
    if (!config.apiSources || config.apiSources.length === 0) {
        return {
            valid: false,
            message: '没有配置API源'
        }
    }

    // 检查当前索引是否有效
    if (config.currentApiIndex < 0 || config.currentApiIndex >= config.apiSources.length) {
        return {
            valid: false,
            message: '当前API源索引无效'
        }
    }

    // 检查当前API源的URL是否有效
    const currentSource = config.apiSources[config.currentApiIndex]
    if (!validateApiDomain(currentSource)) {
        return {
            valid: false,
            message: `当前API源URL无效: ${currentSource}`
        }
    }

    return {
        valid: true,
        message: '配置有效',
        currentSource
    }
}

// ============ 请求头配置管理 ============

// 获取请求头配置
export async function getRequestHeaders() {
    const config = await getAppConfig()
    return config.requestHeaders || DEFAULT_REQUEST_HEADERS
}

// 保存请求头配置
export async function saveRequestHeaders(headers) {
    const config = await getAppConfig()
    config.requestHeaders = { ...DEFAULT_REQUEST_HEADERS, ...headers }
    await saveAppConfig(config)
    return config.requestHeaders
}

// 重置请求头为默认值
export async function resetRequestHeaders() {
    const config = await getAppConfig()
    config.requestHeaders = { ...DEFAULT_REQUEST_HEADERS }
    await saveAppConfig(config)
    return config.requestHeaders
}

// 获取默认请求头配置
export function getDefaultRequestHeaders() {
    return { ...DEFAULT_REQUEST_HEADERS }
}

// 验证请求头配置
export function validateRequestHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return false
    }

    // 检查必需的字段
    const requiredFields = ['source', 'platform', 'version']
    for (const field of requiredFields) {
        if (!headers[field]) {
            return false
        }
    }

    return true
}

// ============ 轻小说源管理 ============

// 添加新的轻小说源
export async function addBookApiSource(url) {
    if (!url) {
        throw new Error('URL不能为空')
    }

    if (!validateApiDomain(url)) {
        throw new Error('无效的URL格式')
    }

    const config = await getAppConfig()

    // 检查是否已存在相同的URL
    const exists = config.bookApiSources.some(source => source === url)
    if (exists) {
        throw new Error('该轻小说源已存在')
    }

    config.bookApiSources.push(url)
    await saveAppConfig(config)
    return true
}

// 删除轻小说源
export async function removeBookApiSource(index) {
    const config = await getAppConfig()

    if (index < 0 || index >= config.bookApiSources.length) {
        throw new Error('无效的索引')
    }

    // 不能删除所有源
    if (config.bookApiSources.length <= 1) {
        throw new Error('至少需要保留一个轻小说源')
    }

    config.bookApiSources.splice(index, 1)

    // 如果删除的是当前使用的源，切换到第一个
    if (config.currentBookApiIndex === index) {
        config.currentBookApiIndex = 0
    } else if (config.currentBookApiIndex > index) {
        // 如果删除的源在当前源之前，需要调整索引
        config.currentBookApiIndex = config.currentBookApiIndex - 1
    }

    // 确保索引在有效范围内
    if (config.currentBookApiIndex >= config.bookApiSources.length) {
        config.currentBookApiIndex = config.bookApiSources.length - 1
    }

    await saveAppConfig(config)
    return true
}

// 切换轻小说源
export async function switchBookApiSource(index) {
    const config = await getAppConfig()

    if (index < 0 || index >= config.bookApiSources.length) {
        throw new Error('无效的索引')
    }

    config.currentBookApiIndex = index
    await saveAppConfig(config)
    return config.bookApiSources[index]
}

// 获取当前轻小说源
export async function getCurrentBookApiSource() {
    const config = await getAppConfig()

    if (config.bookApiSources.length === 0 || config.currentBookApiIndex < 0) {
        return null
    }

    if (config.currentBookApiIndex >= config.bookApiSources.length) {
        // 如果索引超出范围，使用第一个源
        return config.bookApiSources[0]
    }

    return config.bookApiSources[config.currentBookApiIndex]
}

// 初始化默认轻小说API源
export async function initializeDefaultBookApiSources() {
    try {
        const config = await getAppConfig()

        // 如果轻小说API源为空，添加默认源
        if (!config.bookApiSources || config.bookApiSources.length === 0) {
            const defaultBookApiSource = 'https://api.copy-manga.com'

            config.bookApiSources = [defaultBookApiSource]
            config.currentBookApiIndex = 0

            await saveAppConfig(config)
            console.log('已初始化默认轻小说API源:', defaultBookApiSource)
            return true
        }

        return false // 已存在API源，无需初始化
    } catch (error) {
        console.error('初始化默认轻小说API源失败:', error)
        throw error
    }
}

// 获取当前轻小说API域名
export async function getCurrentBookApiDomain() {
    const config = await getAppConfig()

    if (config.bookApiSources.length === 0 || config.currentBookApiIndex < 0) {
        // 如果没有配置，先初始化默认源
        await initializeDefaultBookApiSources()
        const newConfig = await getAppConfig()
        return newConfig.bookApiSources[newConfig.currentBookApiIndex] || 'https://api.copy-manga.com'
    }

    return config.bookApiSources[config.currentBookApiIndex] || 'https://api.copy-manga.com'
}

// 获取所有轻小说源
export async function getBookApiSources() {
    const config = await getAppConfig()
    return config.bookApiSources || []
}

// 验证轻小说源配置
export async function validateBookApiConfig() {
    const config = await getAppConfig()

    // 检查是否有轻小说源
    if (!config.bookApiSources || config.bookApiSources.length === 0) {
        return {
            valid: false,
            message: '没有配置轻小说源'
        }
    }

    // 检查当前索引是否有效
    if (config.currentBookApiIndex < 0 || config.currentBookApiIndex >= config.bookApiSources.length) {
        return {
            valid: false,
            message: '当前轻小说源索引无效'
        }
    }

    // 检查当前轻小说源的URL是否有效
    const currentSource = config.bookApiSources[config.currentBookApiIndex]
    if (!validateApiDomain(currentSource)) {
        return {
            valid: false,
            message: `当前轻小说源URL无效: ${currentSource}`
        }
    }

    return {
        valid: true,
        message: '配置有效',
        currentSource
    }
}
