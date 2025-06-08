import { checkForUpdates } from '@/api/github'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '@/stores/app'

/**
 * 启动时检查更新
 */
export const checkUpdateOnStartup = () => {
    const appStore = useAppStore()
    getVersion().then(appVersion => {
        return checkForUpdates(appVersion)
    }).then(result => {
        appStore.setUpdateInfo(result)
    }).catch(error => {
        console.error('启动时检查更新失败:', error)
    })
}

/**
 * 打开下载页面
 */
export const openDownloadPage = () => {
    invoke('open_browser', { url: 'https://github.com/caolib/copymanga/releases/latest' }).catch(error => {
        console.error('打开下载页面失败:', error)
    })
}
