import { pathHelper, CONFIG_FILES } from './path-helper'

const DEFAULT_SERVER_PORT = '5001'

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
        currentApiIndex: -1
    })

    // 确保配置包含所有必要字段
    const result = {
        apiSources: config.apiSources || [],
        currentApiIndex: config.currentApiIndex || -1
    }

    // 如果当前索引超出范围，重置为-1
    if (result.currentApiIndex >= result.apiSources.length || result.currentApiIndex < -1) {
        result.currentApiIndex = -1
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
    try {
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
    } catch (error) {
        throw error
    }
}

// 删除API源
export async function removeApiSource(index) {
    try {
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
    } catch (error) {
        throw error
    }
}

// 切换API源
export async function switchApiSource(index) {
    try {
        const config = await getAppConfig()

        if (index < 0 || index >= config.apiSources.length) {
            throw new Error('无效的索引')
        }

        config.currentApiIndex = index
        await saveAppConfig(config)
        return config.apiSources[index]
    } catch (error) {
        throw error
    }
}

// 获取当前API源
export async function getCurrentApiSource() {
    try {
        const config = await getAppConfig()

        if (config.apiSources.length === 0 || config.currentApiIndex < 0) {
            return null
        }

        if (config.currentApiIndex >= config.apiSources.length) {
            // 如果索引超出范围，使用第一个源
            return config.apiSources[0]
        }

        return config.apiSources[config.currentApiIndex]
    } catch (error) {
        console.error('获取当前API源失败:', error)
        return null
    }
}

// 获取当前API域名
export async function getCurrentApiDomain() {
    try {
        const currentSource = await getCurrentApiSource()
        return currentSource || null
    } catch (error) {
        console.error('获取当前API域名失败:', error)
        return null
    }
}

// 获取所有API源
export async function getApiSources() {
    try {
        const config = await getAppConfig()
        return config.apiSources || []
    } catch (error) {
        console.error('获取API源列表失败:', error)
        return []
    }
}

// 验证API源配置
export async function validateApiConfig() {
    try {
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
    } catch (error) {
        return {
            valid: false,
            message: '验证配置时出错: ' + error.message
        }
    }
}
