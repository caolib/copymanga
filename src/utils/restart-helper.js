import { invoke } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { useAppStore } from '../stores/app'

/**
 * 重启应用
 * 先停止代理服务器，然后重启应用
 */
export const restartApp = async () => {
    const appStore = useAppStore()

    // 先停止代理服务器
    await invoke('stop_proxy_server').then(() => {
        console.log('代理服务器已停止')
    }).catch(error => {
        console.error('停止代理服务器失败:', error)
    })

    appStore.setNeedsRestart(false)

    // 然后重启应用
    await relaunch()
}
