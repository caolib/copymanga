import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
    state: () => ({
        needsRestart: false
    }),

    actions: {
        setNeedsRestart(value) {
            this.needsRestart = value
        },

        clearNeedsRestart() {
            this.needsRestart = false
        }
    },

    persist: {
        key: 'app-store',
        storage: localStorage
    }
})