/**
 * 导出配置文件的工具函数
 */

import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { dirname } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { message } from 'ant-design-vue'

/**
 * 导出 JSON 配置文件
 * @param {Object} data - 要导出的数据对象
 * @param {Object} options - 导出选项
 * @param {string} options.defaultFileName - 默认文件名（不含扩展名）
 * @param {string} options.fileType - 文件类型描述
 * @param {string} options.successMessage - 成功消息
 * @param {boolean} options.openDirectory - 是否在导出后打开目录
 * @returns {Promise<boolean>} - 是否成功导出
 */
export const exportJsonConfig = async (data, options = {}) => {
    const {
        defaultFileName = 'config',
        fileType = 'JSON Files',
        successMessage = '配置已成功导出',
        openDirectory = true
    } = options

    try {
        // 检查数据是否有效
        if (!data || typeof data !== 'object') {
            message.warning('没有可导出的配置数据')
            return false
        }

        // 检查是否有有效的配置项
        if (Object.keys(data).length === 0) {
            message.warning('没有可导出的配置项')
            return false
        }

        // 打开保存文件对话框
        const filePath = await save({
            filters: [{
                name: fileType,
                extensions: ['json']
            }],
            defaultPath: `${defaultFileName}.json`
        })

        if (!filePath) {
            // 用户取消了保存
            return false
        }

        // 格式化 JSON 并写入文件
        const jsonContent = JSON.stringify(data, null, 2)
        await writeTextFile(filePath, jsonContent)
        message.success(successMessage)

        // 打开文件所在目录
        if (openDirectory) {
            try {
                const dirPath = await dirname(filePath)
                await invoke('open_file_explorer', { path: dirPath })
            } catch (openError) {
                console.warn('无法打开文件所在目录:', openError)
                // 不显示错误消息，因为文件已经成功导出
            }
        }

        return true
    } catch (error) {
        console.error('导出配置失败:', error)
        message.error('导出配置失败: ' + error.message)
        return false
    }
}

/**
 * 导出请求头配置
 * @param {Array} headersList - 请求头列表
 * @returns {Promise<boolean>} - 是否成功导出
 */
export const exportHeaders = async (headersList) => {
    // 将 headersList 转换为键值对对象
    const headersObject = {}
    if (Array.isArray(headersList)) {
        headersList.forEach(header => {
            if (header && header.key && header.value) {
                headersObject[header.key] = header.value
            }
        })
    }

    return await exportJsonConfig(headersObject, {
        defaultFileName: 'headers',
        fileType: 'Headers JSON Files',
        successMessage: '请求头配置已成功导出'
    })
}

/**
 * 导出 API 源配置
 * @param {Array} apiSources - API 源列表
 * @param {number} currentIndex - 当前选中的索引
 * @returns {Promise<boolean>} - 是否成功导出
 */
export const exportApiSources = async (apiSources, currentIndex = 0) => {
    const configData = {
        apiSources: apiSources || [],
        currentApiIndex: currentIndex,
        exportTime: new Date().toISOString()
    }

    return await exportJsonConfig(configData, {
        defaultFileName: 'api-sources',
        fileType: 'API Sources JSON Files',
        successMessage: 'API 源配置已成功导出'
    })
}

/**
 * 导出完整的服务器配置
 * @param {Object} config - 完整的配置对象
 * @returns {Promise<boolean>} - 是否成功导出
 */
export const exportServerConfig = async (config) => {
    const configData = {
        ...config,
        exportTime: new Date().toISOString(),
        version: '1.0'
    }

    return await exportJsonConfig(configData, {
        defaultFileName: 'server-config',
        fileType: 'Server Config JSON Files',
        successMessage: '服务器配置已成功导出'
    })
}
