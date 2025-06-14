import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'
import { join } from '@tauri-apps/api/path'

/**
 * 路径工具类
 * 提供统一的配置文件路径管理和文件操作
 */
class PathHelper {
    constructor() {
        this._configDirPath = null
    }    /**
     * 获取配置目录路径
     * @returns {Promise<string>}
     */
    async getConfigDirPath() {
        if (!this._configDirPath) {
            const appDataPath = await appDataDir()
            this._configDirPath = await join(appDataPath, 'config')
        }
        return this._configDirPath
    }

    /**
     * 获取配置文件路径
     * @param {string} filename - 配置文件名
     * @returns {Promise<string>}
     */
    async getConfigFilePath(filename) {
        const configDir = await this.getConfigDirPath()
        return await join(configDir, filename)
    }

    /**
     * 确保配置目录存在
     * @returns {Promise<void>}
     */
    async ensureConfigDir() {
        const configDir = await this.getConfigDirPath()
        const dirExists = await exists(configDir)
        if (!dirExists) {
            await mkdir(configDir, { recursive: true })
        }
    }    /**
     * 读取配置文件
     * @param {string} filename - 配置文件名
     * @param {any} defaultConfig - 默认配置
     * @returns {Promise<any>}
     */
    async readConfig(filename, defaultConfig = null) {
        try {
            await this.ensureConfigDir()
            const configPath = await this.getConfigFilePath(filename)
            const fileExists = await exists(configPath)

            if (!fileExists) {
                // 如果配置文件不存在且提供了默认配置，则创建配置文件
                if (defaultConfig !== null) {
                    await this.saveConfig(filename, defaultConfig)
                    return defaultConfig
                }
                return null
            }

            const content = await readTextFile(configPath)
            return JSON.parse(content)
        } catch (error) {
            console.error(`读取配置文件 ${filename} 失败:`, error)
            // 如果读取失败且提供了默认配置，尝试创建配置文件
            if (defaultConfig !== null) {
                try {
                    await this.saveConfig(filename, defaultConfig)
                    return defaultConfig
                } catch (saveError) {
                    console.error(`创建默认配置文件 ${filename} 失败:`, saveError)
                }
            }
            return defaultConfig
        }
    }

    /**
     * 保存配置文件
     * @param {string} filename - 配置文件名
     * @param {any} config - 配置内容
     * @returns {Promise<boolean>}
     */
    async saveConfig(filename, config) {
        try {
            await this.ensureConfigDir()
            const configPath = await this.getConfigFilePath(filename)
            await writeTextFile(configPath, JSON.stringify(config, null, 2))
            return true
        } catch (error) {
            console.error(`保存配置文件 ${filename} 失败:`, error)
            throw new Error(`保存配置失败: ${error.message}`)
        }
    }

    /**
     * 检查配置文件是否存在
     * @param {string} filename - 配置文件名
     * @returns {Promise<boolean>}
     */
    async configExists(filename) {
        try {
            const configPath = await this.getConfigFilePath(filename)
            return await exists(configPath)
        } catch (error) {
            console.error(`检查配置文件 ${filename} 是否存在失败:`, error)
            return false
        }
    }
}

// 导出单例实例
export const pathHelper = new PathHelper()

// 配置文件名常量 - 与 Rust 后端保持一致
export const CONFIG_FILES = {
    SERVER: 'server.json',
    APP: 'copymanga.json',
    UI: 'ui.json'
}
