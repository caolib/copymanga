import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'

import './assets/styles/main.css'

// 初始化pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 创建Vue应用
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)

app.mount('#app')