import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
    state: () => ({
        needsRestart: false,
        disclaimerAccepted: false,
        autoCheckUpdate: true, // 默认启用自动检查更新
        hasUpdate: false, // 是否有可用更新
        updateInfo: null // 更新信息
    }),

    actions: {
        setNeedsRestart(value) {
            this.needsRestart = value
        },

        clearNeedsRestart() {
            this.needsRestart = false
        },

        setDisclaimerAccepted(value) {
            this.disclaimerAccepted = value
        },

        setAutoCheckUpdate(value) {
            this.autoCheckUpdate = value
        },

        setUpdateInfo(updateInfo) {
            this.hasUpdate = updateInfo?.hasUpdate || false
            this.updateInfo = updateInfo
        },

        clearUpdateInfo() {
            this.hasUpdate = false
            this.updateInfo = null
        }
    },

    persist: {
        key: 'app-store',
        storage: localStorage
    }
})