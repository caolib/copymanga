<template>
    <div class="title-bar" data-tauri-drag-region>
        <div class="title-bar-left">
            <!-- 用户头像在左侧 -->
            <div class="user-section" data-tauri-drag-region="false">
                <template v-if="isLoggedInComputed">
                    <a-dropdown trigger="hover" placement="bottomRight">
                        <span class="user-avatar-dropdown">
                            <a-avatar :src="userInfo?.avatar || '/logo.png'"
                                :alt="userInfo?.nickname || userInfo?.username || '用户头像'" size="32" />
                        </span>
                        <template #overlay> <a-menu>
                                <a-menu-item key="profile" @click="goToProfile">
                                    <UserOutlined class="menu-icon" /> 个人中心
                                </a-menu-item>
                                <a-menu-item key="logout" style="color:#ff6b6b" @click="handleLogout">
                                    <LogoutOutlined class="menu-icon" /> 退出登录
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </template> <template v-else>
                    <router-link to="/login" class="nav-link login-link">登录</router-link>
                </template>
            </div>

            <!-- 导航栏 -->
            <nav class="nav" data-tauri-drag-region="false">
                <router-link to="/" class="nav-link">首页</router-link>
                <router-link to="/my-collection" class="nav-link" v-if="isLoggedInComputed">我的书架</router-link>
                <router-link to="/settings" class="nav-link">设置</router-link> <button @click="themeStore.toggleTheme"
                    class="theme-toggle-btn" :title="themeStore.isDarkMode ? '切换到浅色模式' : '切换到深色模式'">
                    {{ themeStore.isDarkMode ? '🌞' : '🌙' }}
                </button>
                <!-- 前进后退按钮 -->
                <div class="navigation-controls" data-tauri-drag-region="false">
                    <a-button type="text" size="small" @click="goBack" title="后退">
                        <ArrowLeftOutlined />
                    </a-button>
                    <a-button type="text" size="small" @click="goForward" title="前进">
                        <ArrowRightOutlined />
                    </a-button>
                </div>
            </nav>
        </div>

        <div class="title-bar-center">
            <!-- 中间区域用于拖动 -->
        </div>
        <div class="title-bar-right">
            <!-- 窗口控制按钮 -->
            <div class="window-controls" data-tauri-drag-region="false">
                <button class="title-bar-button minimize" @click="minimizeWindow" title="最小化">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <rect x="2" y="5" width="8" height="2" fill="currentColor" />
                    </svg>
                </button>

                <button class="title-bar-button maximize" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
                    <svg width="12" height="12" viewBox="0 0 12 12" v-if="!isMaximized">
                        <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1" />
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 12 12" v-else>
                        <rect x="2" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
                        <rect x="4" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
                    </svg>
                </button>

                <button class="title-bar-button close" @click="closeWindow" title="关闭">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5"
                            stroke-linecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isLoggedIn, logout } from '../utils/auth'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import { UserOutlined, LogoutOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const isMaximized = ref(false)
const currentWindow = getCurrentWindow()

const isLoggedInComputed = computed(() => isLoggedIn())
const userInfo = computed(() => userStore.userInfo)

// 前进后退功能
const goBack = () => {
    router.go(-1)
}

const goForward = () => {
    router.go(1)
}

// 用于存储监听器清理函数
let unlisten = null

onMounted(async () => {
    // 监听窗口状态变化
    unlisten = await currentWindow.onResized(async () => {
        isMaximized.value = await currentWindow.isMaximized()
    })

    // 初始检查窗口状态
    isMaximized.value = await currentWindow.isMaximized()

    // 如果已登录，获取用户信息
    if (isLoggedInComputed.value) {
        await userStore.fetchUserInfo().catch(error => {
            console.error('获取用户信息失败:', error)
        })
    }
})

// 组件销毁时清理监听器
onUnmounted(() => {
    if (unlisten) {
        unlisten()
    }
})

const minimizeWindow = async () => {
    await currentWindow.minimize()
}

const toggleMaximize = async () => {
    await currentWindow.toggleMaximize()
}

const closeWindow = async () => {
    await currentWindow.close()
}

const handleLogout = () => {
    logout()
    router.push('/login')
}

const goToProfile = () => {
    router.push('/profile')
}
</script>

<style src="../assets/styles/title-bar.scss" lang="scss" scoped></style>
