import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
    const isInitialized = ref(false)
    const isServerStarted = ref(false)
    const initPromise = ref(null)

    const setInitialized = () => {
        isInitialized.value = true
    }

    const setServerStarted = () => {
        isServerStarted.value = true
    }

    const setInitPromise = (promise) => {
        initPromise.value = promise
    }

    const waitForInit = async () => {
        if (isInitialized.value) {
            return
        }
        if (initPromise.value) {
            await initPromise.value
        }
    }

    return {
        isInitialized,
        isServerStarted,
        initPromise,
        setInitialized,
        setServerStarted,
        setInitPromise,
        waitForInit
    }
})
