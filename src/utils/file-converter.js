import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * 安全的文件路径转换函数 - 处理Windows路径问题
 * @param {string} path 本地文件路径
 * @returns {string} 转换后的URL
 */
function safeConvertFileSrc(path) {
    if (!path) return ''

    // 移除 Windows UNC 前缀 \\?\
    let cleanPath = path.replace(/^\\\\\?\\/, '')

    // 规范化路径分隔符为正斜杠
    cleanPath = cleanPath.replace(/\\/g, '/')

    return convertFileSrc(cleanPath)
}

/**
 * 将本地文件路径转换为可在浏览器中显示的URL
 * @param {string} localPath 本地文件路径
 * @returns {string} 转换后的URL，失败时返回空字符串
 */
function convertLocalFileToUrl(localPath) {
    try {
        if (!localPath) return ''
        return safeConvertFileSrc(localPath)
    } catch (error) {
        console.error('转换文件路径失败:', error)
        return ''
    }
}

export {
    safeConvertFileSrc,
    convertLocalFileToUrl
}
