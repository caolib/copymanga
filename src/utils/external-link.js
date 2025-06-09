import { invoke } from '@tauri-apps/api/core'
import { message } from 'ant-design-vue'

/**
 * 使用系统默认浏览器打开外部链接
 * @param {string} url - 要打开的URL
 * @param {string} errorMsg - 失败时显示的错误消息
 */
const openExternalUrl = (url, errorMsg = '打开链接失败') => {
    invoke('open_browser', { url }).catch(error => {
        console.error('打开链接失败:', error)
        message.error(errorMsg)
    })
}

export {
    openExternalUrl
}
