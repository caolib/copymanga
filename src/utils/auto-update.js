import { checkForUpdates } from '@/api/github'
import { getVersion } from '@tauri-apps/api/app'
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