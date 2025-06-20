import { invoke } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { useAppStore } from '../stores/app'

/**
 * 重启应用
 * 先停止代理服务器，等待完全停止后再重启应用
 */
export const restartApp = async () => {
    const appStore = useAppStore()

    try {
        // 先停止代理服务器
        await invoke('stop_proxy_server')
        console.log('代理服务器停止信号已发送')

        // 额外等待一段时间确保服务器完全停止并释放端口
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('等待完成，准备重启应用')

    } catch (error) {
        console.error('停止代理服务器失败:', error)
        // 即使停止失败也继续重启
    }

    appStore.setNeedsRestart(false)

    // 然后重启应用
    await relaunch()
}
