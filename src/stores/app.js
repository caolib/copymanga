import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
    state: () => ({
        needsRestart: false,
        disclaimerAccepted: false
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
        }
    },

    persist: {
        key: 'app-store',
        storage: localStorage
    }
})