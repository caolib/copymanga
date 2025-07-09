/**
 * 导出配置文件的工具函数
 */

import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
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
    openDirectory = true,
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
      filters: [
        {
          name: fileType,
          extensions: ['json'],
        },
      ],
      defaultPath: `${defaultFileName}.json`,
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
    headersList.forEach((header) => {
      if (header && header.key && header.value) {
        headersObject[header.key] = header.value
      }
    })
  }

  return await exportJsonConfig(headersObject, {
    defaultFileName: 'headers',
    fileType: 'Headers JSON Files',
    successMessage: '请求头配置已成功导出',
  })
}

/**
 * 导入 JSON 配置文件
 * @param {Object} options - 导入选项
 * @param {string} options.fileType - 文件类型描述
 * @param {string} options.successMessage - 成功消息
 * @param {Function} options.validator - 数据验证函数
 * @returns {Promise<Object|null>} - 导入的数据对象，失败返回 null
 */
export const importJsonConfig = async (options = {}) => {
  const { fileType = 'JSON Files', successMessage = '配置已成功导入', validator = null } = options

  try {
    // 打开文件选择对话框
    const filePath = await open({
      filters: [
        {
          name: fileType,
          extensions: ['json'],
        },
      ],
      multiple: false,
    })

    if (!filePath) {
      // 用户取消了选择
      return null
    }

    // 读取文件内容
    const fileContent = await readTextFile(filePath)

    // 解析 JSON
    let data
    try {
      data = JSON.parse(fileContent)
    } catch (err) {
      message.error('JSON 文件格式错误，请检查文件内容', err)
      return null
    }

    // 数据验证
    if (validator && typeof validator === 'function') {
      const validationResult = validator(data)
      if (!validationResult.valid) {
        message.error(validationResult.message || '导入的数据格式不正确')
        return null
      }
    }

    message.success(successMessage)
    return data
  } catch (error) {
    console.error('导入配置失败:', error)
    message.error('导入配置失败: ' + error.message)
    return null
  }
}

/**
 * 导入请求头配置
 * @returns {Promise<Object|null>} - 导入的请求头对象，失败返回 null
 */
export const importHeaders = async () => {
  // 请求头数据验证函数
  const validateHeaders = (data) => {
    // 检查是否是对象
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        valid: false,
        message: '请求头配置必须是一个包含键值对的对象',
      }
    }

    // 检查所有键值对是否都是字符串
    for (const [key, value] of Object.entries(data)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return {
          valid: false,
          message: '请求头的键和值都必须是字符串',
        }
      }

      // 检查键是否为空
      if (!key.trim()) {
        return {
          valid: false,
          message: '请求头名称不能为空',
        }
      }
    }

    return { valid: true }
  }

  return await importJsonConfig({
    fileType: 'Headers JSON Files',
    successMessage: '请求头配置已成功导入',
    validator: validateHeaders,
  })
}
