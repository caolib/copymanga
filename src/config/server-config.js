import { pathHelper, CONFIG_FILES } from '@/utils/path-helper'

// ============ 默认配置常量 ============

// 默认服务器配置
const DEFAULT_SERVER_CONFIG = {
    serverPort: 12121,
    requestHeaders: {
        "user-agent": "COPY/2.3.1",
        "source": "copyApp",
        "deviceinfo": "PGEM10-star2qltechn",
        "webp": "1",
        "platform": "3",
        "referer": "com.copymanga.app-2.3.1",
        "version": "2.3.1",
        "region": "1",
        "device": "PQ3B.190801.05281406",
        "host": "api.copy2000.online",
        "umstring": "b4c89ca4104ea9a97750314d791520ac",
        "pseudoid": "eQcnVQUDUW08t8iH"
    }
}

// 默认请求头
const DEFAULT_REQUEST_HEADERS = DEFAULT_SERVER_CONFIG.requestHeaders

// 默认API源
const DEFAULT_API_SOURCES = [
    "https://api.copy2000.online",
    "https://copy20.com"
]

// 默认轻小说API源
const DEFAULT_BOOK_API_SOURCE = "https://api.copy-manga.com"

// 默认应用配置
const DEFAULT_APP_CONFIG = {
    apiSources: [...DEFAULT_API_SOURCES],
    currentApiIndex: 0,
    bookApiSources: [DEFAULT_BOOK_API_SOURCE],
    currentBookApiIndex: 0
}

// ============ 初始化函数 ============

// 初始化所有配置文件
export async function initializeAllConfigs() {
    // 确保配置目录存在
    await pathHelper.ensureConfigDir()

    // 初始化服务器配置
    const serverExists = await pathHelper.configExists(CONFIG_FILES.SERVER)
    if (!serverExists) {
        await pathHelper.saveConfig(CONFIG_FILES.SERVER, DEFAULT_SERVER_CONFIG)
        // console.log('已创建默认服务器配置文件')
    }

    // 初始化应用配置
    const appExists = await pathHelper.configExists(CONFIG_FILES.APP)
    if (!appExists) {
        await pathHelper.saveConfig(CONFIG_FILES.APP, DEFAULT_APP_CONFIG)
        // console.log('已创建默认应用配置文件')
    }
}

// ============ 配置读取和保存 ============

// 读取服务器配置
export async function getServerConfig() {
    // 等待配置初始化完成
    const { useConfigStore } = await import('../stores/config')
    const configStore = useConfigStore()
    await configStore.waitForInit()

    const config = await pathHelper.readConfig(CONFIG_FILES.SERVER)

    if (!config) {
        throw new Error('服务器配置文件不存在或读取失败')
    }

    if (!config.serverPort) {
        throw new Error('服务器配置缺少端口号')
    }

    return {
        serverPort: config.serverPort,
        serverUrl: `http://localhost:${config.serverPort}`,
        requestHeaders: config.requestHeaders
    }
}

// 读取应用配置
export async function getAppConfig() {
    // 等待配置初始化完成
    const { useConfigStore } = await import('../stores/config')
    const configStore = useConfigStore()
    await configStore.waitForInit()

    const config = await pathHelper.readConfig(CONFIG_FILES.APP)

    if (!config) {
        throw new Error('应用配置文件不存在或读取失败')
    }

    if (!config.apiSources || !Array.isArray(config.apiSources) || config.apiSources.length === 0) {
        throw new Error('应用配置缺少API源或API源为空')
    }

    const result = {
        apiSources: config.apiSources,
        currentApiIndex: config.currentApiIndex !== undefined ? config.currentApiIndex : 0,
        bookApiSources: config.bookApiSources || [],
        currentBookApiIndex: config.currentBookApiIndex !== undefined ? config.currentBookApiIndex : 0
    }

    // 如果当前索引超出范围，重置为0
    if (result.currentApiIndex >= result.apiSources.length || result.currentApiIndex < 0) {
        result.currentApiIndex = 0
    }

    if (result.bookApiSources.length > 0 && (result.currentBookApiIndex >= result.bookApiSources.length || result.currentBookApiIndex < 0)) {
        result.currentBookApiIndex = 0
    }

    return result
}

// 保存服务器配置
export async function saveServerConfig(serverPort, requestHeaders = null) {
    const currentConfig = await pathHelper.readConfig(CONFIG_FILES.SERVER)

    if (!currentConfig) {
        throw new Error('无法读取当前服务器配置')
    }

    // 确保端口是数字类型
    const portNumber = typeof serverPort === 'string' ? parseInt(serverPort) : serverPort

    const newConfig = {
        ...currentConfig,
        serverPort: portNumber
    }

    if (requestHeaders) {
        newConfig.requestHeaders = requestHeaders
    }

    return await pathHelper.saveConfig(CONFIG_FILES.SERVER, newConfig)
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
    // 等待配置初始化完成
    const { useConfigStore } = await import('../stores/config')
    const configStore = useConfigStore()
    await configStore.waitForInit()

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

// ============ 请求头配置管理 ============

// 获取请求头配置
export async function getRequestHeaders() {
    // 等待配置初始化完成
    const { useConfigStore } = await import('../stores/config')
    const configStore = useConfigStore()
    await configStore.waitForInit()

    const config = await getServerConfig()
    return config.requestHeaders
}

// 保存请求头配置
export async function saveRequestHeaders(headers) {
    const serverConfig = await pathHelper.readConfig(CONFIG_FILES.SERVER, DEFAULT_SERVER_CONFIG)
    serverConfig.requestHeaders = { ...headers }
    await pathHelper.saveConfig(CONFIG_FILES.SERVER, serverConfig)
    return serverConfig.requestHeaders
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

    // 检查是否是有效的键值对对象
    for (const [key, value] of Object.entries(headers)) {
        // 键必须是非空字符串
        if (typeof key !== 'string' || key.trim() === '') {
            return false
        }
        // 值必须是字符串
        if (typeof value !== 'string') {
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

// 初始化默认API源
export async function initializeDefaultApiSources() {
    // 直接读取配置文件，不等待初始化完成（避免死锁）
    const config = await pathHelper.readConfig(CONFIG_FILES.APP)

    if (!config) {
        throw new Error('应用配置文件不存在，无法初始化默认API源')
    }

    // 如果API源为空，添加默认源
    if (!config.apiSources || config.apiSources.length === 0) {
        config.apiSources = [...DEFAULT_API_SOURCES]
        config.currentApiIndex = 0

        await saveAppConfig(config).then(() => {
            // console.log('已初始化默认API源:', DEFAULT_API_SOURCES)
        }).catch(error => {
            console.error('初始化默认API源失败:', error)
            throw error
        })

        return true
    }

    // console.log('API源已存在，无需初始化')
    return false // 已存在API源，无需初始化
}

// 初始化默认轻小说API源
export async function initializeDefaultBookApiSources() {
    // 直接读取配置文件，不等待初始化完成（避免死锁）
    const config = await pathHelper.readConfig(CONFIG_FILES.APP)

    if (!config) {
        throw new Error('应用配置文件不存在，无法初始化默认轻小说API源')
    }

    // 如果轻小说API源为空，添加默认源
    if (!config.bookApiSources || config.bookApiSources.length === 0) {
        config.bookApiSources = [DEFAULT_BOOK_API_SOURCE]
        config.currentBookApiIndex = 0

        await saveAppConfig(config).then(() => {
            // console.log('已初始化默认轻小说API源:', DEFAULT_BOOK_API_SOURCE)
        }).catch(error => {
            console.error('初始化默认轻小说API源失败:', error)
            throw error
        })

        return true
    }

    // console.log('轻小说API源已存在，无需初始化')
    return false
}

// 获取当前轻小说API域名
export async function getCurrentBookApiDomain() {
    const config = await getAppConfig()

    if (config.bookApiSources.length === 0 || config.currentBookApiIndex < 0) {
        // 如果没有配置，先初始化默认源
        await initializeDefaultBookApiSources()
        const newConfig = await getAppConfig()
        return newConfig.bookApiSources[newConfig.currentBookApiIndex]
    }

    return config.bookApiSources[config.currentBookApiIndex]
}

// 获取所有轻小说源
export async function getBookApiSources() {
    const config = await getAppConfig()
    return config.bookApiSources
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
