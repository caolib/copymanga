import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'

import './assets/styles/main.scss'

// 初始化pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 创建Vue应用
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)

// 初始化主题
app.mount('#app')

// 在应用挂载后异步初始化主题
const themeStore = useThemeStore()
themeStore.initTheme().catch(error => {
    console.error('初始化主题失败:', error)
})