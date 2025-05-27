import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appConfigDir, join } from '@tauri-apps/api/path'

const DEFAULT_SERVER_PORT = '5001'
const DEFAULT_API_DOMAIN = 'https://copy20.com'

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
                apiDomain: DEFAULT_API_DOMAIN
            }
        }

        const content = await readTextFile(configPath)
        const config = JSON.parse(content)
        return {
            apiDomain: config.apiDomain || DEFAULT_API_DOMAIN
        }
    } catch (error) {
        console.error('读取应用配置失败:', error)
        return {
            apiDomain: DEFAULT_API_DOMAIN
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
export async function saveAppConfig(apiDomain) {
    try {
        await ensureConfigDir()
        const configPath = await getAppConfigFilePath()
        const config = { apiDomain }

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
