import { invoke } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { useAppStore } from '../stores/app'

/**
 * 重启应用
 */
export const restartApp = async () => {
    const appStore = useAppStore()

    try {
        console.log('准备重启应用')
    } catch (error) {
        console.error('重启前处理失败:', error)
        // 即使失败也继续重启
    }

    appStore.setNeedsRestart(false)

    // 重启应用
    await relaunch()
}
