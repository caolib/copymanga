import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appConfigDir, join } from '@tauri-apps/api/path'

// 默认UI配置
const DEFAULT_UI_CONFIG = {
    reader: {
        layout: 'rtl', // 从右到左（默认，日漫风格）
        columnsPerRow: 2, // 一行显示的列数
        imageSize: 100, // 图片大小百分比
        imageGap: 8 // 图片间距，单位px
    }
}

// 获取UI配置文件路径
async function getConfigFilePath() {
    const configDir = await appConfigDir()
    return await join(configDir, 'ui.json')
}

// 确保配置目录存在
async function ensureConfigDir() {
    const configDir = await appConfigDir()
    const dirExists = await exists(configDir)
    if (!dirExists) {
        await mkdir(configDir, { recursive: true })
    }
}

// 加载UI配置
async function loadUIConfig() {
    try {
        await ensureConfigDir()
        const configPath = await getConfigFilePath()

        // 检查配置文件是否存在
        const fileExists = await exists(configPath)
        if (fileExists) {
            const content = await readTextFile(configPath)
            const config = JSON.parse(content)
            return { ...DEFAULT_UI_CONFIG, ...config }
        }

        // 如果文件不存在，返回默认配置并创建配置文件
        await saveUIConfig(DEFAULT_UI_CONFIG)
        return DEFAULT_UI_CONFIG
    } catch (error) {
        console.error('加载UI配置失败:', error)
        return DEFAULT_UI_CONFIG
    }
}

// 保存UI配置
async function saveUIConfig(config) {
    try {
        await ensureConfigDir()
        const configPath = await getConfigFilePath()
        const content = JSON.stringify(config, null, 2)
        await writeTextFile(configPath, content)
        return true
    } catch (error) {
        console.error('保存UI配置失败:', error)
        return false
    }
}

// 更新UI配置
async function updateUIConfig(newConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = { ...currentConfig, ...newConfig }
    return await saveUIConfig(updatedConfig)
}

// 更新阅读器配置
async function updateReaderConfig(readerConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = {
        ...currentConfig,
        reader: {
            ...currentConfig.reader,
            ...readerConfig
        }
    }
    return await saveUIConfig(updatedConfig)
}

export {
    loadUIConfig,
    saveUIConfig,
    updateUIConfig,
    updateReaderConfig,
    DEFAULT_UI_CONFIG
}