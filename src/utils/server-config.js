import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appConfigDir, join } from '@tauri-apps/api/path'

const DEFAULT_SERVER_PORT = '5001'
const DEFAULT_API_DOMAIN = 'https://copy20.com'

// 默认API源列表
const DEFAULT_API_SOURCES = [
    { name: '默认源', url: 'https://copy20.com' },
    { name: '备用源1', url: 'https://api.copy2000.online' },
]

// 获取服务器配置文件路径
async function getConfigFilePath() {
    const configDir = await appConfigDir()
    return await join(configDir, 'server.json')
}

// 获取应用配置文件路径
async function getAppConfigFilePath() {
    const configDir = await appConfigDir()
    return await join(configDir, 'copymanga.json')
}

// 确保配置目录存在
async function ensureConfigDir() {
    const configDir = await appConfigDir()
    const dirExists = await exists(configDir)
    if (!dirExists) {
        await mkdir(configDir, { recursive: true })
    }
}

// 读取服务器配置
export async function getServerConfig() {
    try {
        await ensureConfigDir()
        const configPath = await getConfigFilePath()
        const fileExists = await exists(configPath)

        if (!fileExists) {
            // 如果文件不存在，返回默认配置
            return {
                serverPort: DEFAULT_SERVER_PORT,
                serverUrl: `http://localhost:${DEFAULT_SERVER_PORT}`
            }
        }

        const content = await readTextFile(configPath)
        const config = JSON.parse(content)
        const port = config.serverPort || DEFAULT_SERVER_PORT
        return {
            serverPort: port,
            serverUrl: `http://localhost:${port}`
        }
    } catch (error) {
        console.error('读取服务器配置失败:', error)
        return {
            serverPort: DEFAULT_SERVER_PORT,
            serverUrl: `http://localhost:${DEFAULT_SERVER_PORT}`
        }
    }
}

// 读取应用配置
export async function getAppConfig() {
    try {
        await ensureConfigDir()
        const configPath = await getAppConfigFilePath()
        const fileExists = await exists(configPath)

        if (!fileExists) {
            // 如果文件不存在，返回默认配置
            return {
                apiDomain: DEFAULT_API_DOMAIN,
                apiSources: DEFAULT_API_SOURCES,
                currentApiIndex: 0
            }
        }

        const content = await readTextFile(configPath)
        const config = JSON.parse(content)

        // 确保配置包含所有必要字段
        const result = {
            apiDomain: config.apiDomain || DEFAULT_API_DOMAIN,
            apiSources: config.apiSources || DEFAULT_API_SOURCES,
            currentApiIndex: config.currentApiIndex || 0
        }

        // 如果当前索引超出范围，重置为0
        if (result.currentApiIndex >= result.apiSources.length) {
            result.currentApiIndex = 0
        }

        return result
    } catch (error) {
        console.error('读取应用配置失败:', error)
        return {
            apiDomain: DEFAULT_API_DOMAIN,
            apiSources: DEFAULT_API_SOURCES,
            currentApiIndex: 0
        }
    }
}

// 保存服务器配置
export async function saveServerConfig(serverPort) {
    try {
        await ensureConfigDir()
        const configPath = await getConfigFilePath()
        const config = { serverPort }

        await writeTextFile(configPath, JSON.stringify(config, null, 2))
        return true
    } catch (error) {
        console.error('保存服务器配置失败:', error)
        throw new Error('保存配置失败: ' + error.message)
    }
}

// 保存应用配置
export async function saveAppConfig(config) {
    try {
        await ensureConfigDir()
        const configPath = await getAppConfigFilePath()

        // 如果传入的是字符串（向后兼容），转换为新格式
        if (typeof config === 'string') {
            const currentConfig = await getAppConfig()
            config = {
                ...currentConfig,
                apiDomain: config
            }
        }

        await writeTextFile(configPath, JSON.stringify(config, null, 2))
        return true
    } catch (error) {
        console.error('保存应用配置失败:', error)
        throw new Error('保存配置失败: ' + error.message)
    }
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
export async function addApiSource(name, url) {
    try {
        if (!name || !url) {
            throw new Error('名称和URL不能为空')
        }

        if (!validateApiDomain(url)) {
            throw new Error('无效的URL格式')
        }

        const config = await getAppConfig()

        // 检查是否已存在相同的URL
        const exists = config.apiSources.some(source => source.url === url)
        if (exists) {
            throw new Error('该API源已存在')
        }

        config.apiSources.push({ name, url })
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

        // 不能删除默认源
        if (config.apiSources.length <= 1) {
            throw new Error('至少需要保留一个API源')
        }

        config.apiSources.splice(index, 1)

        // 如果删除的是当前使用的源，切换到第一个
        if (config.currentApiIndex >= config.apiSources.length) {
            config.currentApiIndex = 0
        }

        // 更新当前API域名
        config.apiDomain = config.apiSources[config.currentApiIndex].url

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
        config.apiDomain = config.apiSources[index].url

        await saveAppConfig(config)
        return config.apiSources[index]
    } catch (error) {
        throw error
    }
}

// 保持向后兼容的 URL 验证函数 (已废弃，使用端口验证)
export function validateServerUrl(url) {
    // 如果是纯数字，按端口处理
    const portNum = parseInt(url)
    if (!isNaN(portNum)) {
        return validateServerPort(portNum)
    }

    // 否则按URL处理
    try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'http:' && urlObj.hostname === 'localhost'
    } catch {
        return false
    }
}
