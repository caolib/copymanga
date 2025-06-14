import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { invoke } from '@tauri-apps/api/core'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useConfigStore } from './stores/config'
import {
    initializeAllConfigs,
    initializeDefaultApiSources,
    initializeDefaultBookApiSources
} from './config/server-config'
import { initializeUIConfig } from './config/ui-config'

import './assets/styles/main.scss'

// 初始化pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)

// 挂载应用
app.mount('#app')

const themeStore = useThemeStore()
const configStore = useConfigStore()

// 创建配置初始化Promise
const initPromise = Promise.all([
    initializeAllConfigs(),
    initializeUIConfig()
]).then(() => {
    return Promise.all([
        initializeDefaultApiSources().then(result => {
            return result
        }).catch(error => {
            throw error
        }),
        initializeDefaultBookApiSources().then(result => {
            return result
        }).catch(error => {
            console.error('默认轻小说API源初始化失败:', error)
            throw error
        })
    ])
}).then(() => {
    if (!configStore.isServerStarted) {
        return invoke('start_proxy_server')
    } else {
        return '代理服务器已经在运行'
    }
}).then((result) => {
    console.log('代理服务器启动结果:', result)
    configStore.setServerStarted()
    return themeStore.initTheme()
}).then(() => {
    configStore.setInitialized()
    console.log('所有初始化完成')
}).catch(error => {
    console.error('初始化失败:', error)
    // 详细的错误信息
    if (error.stack) {
        console.error('错误堆栈:', error.stack)
    }
    configStore.setInitialized()
})

// 设置初始化Promise到store
configStore.setInitPromise(initPromise)