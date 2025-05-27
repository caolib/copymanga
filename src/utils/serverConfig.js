import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appConfigDir, join } from '@tauri-apps/api/path'

const DEFAULT_SERVER_URL = 'http://localhost:5001'

// 获取服务器配置文件路径
async function getConfigFilePath() {
    const configDir = await appConfigDir()
    return await join(configDir, 'server.json')
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
            return { serverUrl: DEFAULT_SERVER_URL }
        }

        const content = await readTextFile(configPath)
        const config = JSON.parse(content)
        return { serverUrl: config.serverUrl || DEFAULT_SERVER_URL }
    } catch (error) {
        console.error('读取服务器配置失败:', error)
        return { serverUrl: DEFAULT_SERVER_URL }
    }
}

// 保存服务器配置
export async function saveServerConfig(serverUrl) {
    try {
        await ensureConfigDir()
        const configPath = await getConfigFilePath()
        const config = { serverUrl }

        await writeTextFile(configPath, JSON.stringify(config, null, 2))
        return true
    } catch (error) {
        console.error('保存服务器配置失败:', error)
        throw new Error('保存配置失败: ' + error.message)
    }
}

// 验证服务器 URL 格式
export function validateServerUrl(url) {
    try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
        return false
    }
}
