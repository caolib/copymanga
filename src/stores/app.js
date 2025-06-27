import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    needsRestart: false,
    disclaimerAccepted: false,
    autoCheckUpdate: true, // 默认启用自动检查更新
    hasUpdate: false, // 是否有可用更新
    updateInfo: null, // 更新信息
    postAgeConfirmed: false, // 是否已确认写真区域年龄要求
  }),

  actions: {
    setNeedsRestart(value) {
      this.needsRestart = value
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
    },

    setPostAgeConfirmed(value) {
      this.postAgeConfirmed = value
    },
  },

  persist: {
    key: 'app-store',
    storage: localStorage,
  },
})
