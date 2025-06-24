<template>
    <div class="title-bar" data-tauri-drag-region>
        <div class="title-bar-left">
            <!-- 用户头像在左侧 -->
            <div class="user-section" data-tauri-drag-region="false">
                <template v-if="isLoggedInComputed">
                    <a-dropdown trigger="hover" placement="bottomRight">
                        <span class="user-avatar-dropdown">
                            <a-avatar :src="getAvatarUrl(userInfo?.avatar) || '/logo.png'"
                                :alt="userInfo?.nickname || userInfo?.username || '用户头像'" size="32" />
                        </span>
                        <template #overlay>
                            <a-menu>
                                <a-menu-item key="profile" @click="goToProfile">
                                    <UserOutlined class="menu-icon" /> 个人中心
                                </a-menu-item>
                                <a-menu-divider v-if="userStore.savedAccounts.length > 1" />
                                <!-- 多账号列表 -->
                                <template v-if="userStore.savedAccounts.length > 1">
                                    <a-menu-item-group title="切换账号">
                                        <a-menu-item
                                            v-for="account in userStore.savedAccounts.filter(acc => acc.username !== userStore.username)"
                                            :key="'switch-' + account.username"
                                            @click="switchAccount(account.username)">
                                            <div class="account-switch-item">
                                                <a-avatar :src="getAvatarUrl(account.userInfo?.avatar)" size="small" />
                                                <span class="account-name">{{ account.userInfo?.nickname ||
                                                    account.username }}</span>
                                            </div>
                                        </a-menu-item>
                                    </a-menu-item-group>
                                    <a-menu-divider />
                                </template>
                                <a-menu-item key="add-account" @click="addNewAccount">
                                    <PlusOutlined class="menu-icon" /> 添加账号
                                </a-menu-item>
                                <a-menu-divider />
                                <a-menu-item key="logout" style="color:#ff6b6b" @click="handleLogout">
                                    <LogoutOutlined class="menu-icon" /> 退出登录
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </template>
                <template v-else>
                    <router-link to="/login" class="nav-link login-link">登录</router-link>
                </template>
            </div>

            <!-- 导航栏 -->
            <nav class="nav" data-tauri-drag-region="true">
                <router-link to="/" class="nav-link">漫画</router-link>
                <router-link to="/books" class="nav-link">轻小说</router-link>
                <router-link to="/cartoons" class="nav-link">动画</router-link>
                <router-link to="/posts" class="nav-link">写真</router-link>
                <router-link to="/bookshelf" class="nav-link" v-if="isLoggedInComputed">
                    <StarFilled class="nav-icon collection-icon" />书架
                </router-link>
                <router-link to="/downloads" class="nav-link">下载</router-link>
                <router-link to="/settings" class="nav-link settings-link">
                    <SettingFilled class="nav-icon" />
                    <span v-if="hasUpdate" class="nav-update-indicator"></span>
                </router-link>
                <button @click="themeStore.toggleTheme" class="theme-toggle-btn"
                    :title="themeStore.isDarkMode ? '切换到浅色模式' : '切换到深色模式'">
                    {{ themeStore.isDarkMode ? '🌞' : '🌙' }}
                </button>
                <a-button type="text" class="nav-link" @click="goBack" title="后退"
                    :icon="h(ArrowLeftOutlined)"></a-button>
                <a-button type="text" class="nav-link" @click="goForward" title="前进"
                    :icon="h(ArrowRightOutlined)"></a-button>
                <a-button type="text" class="nav-link" @click="refreshPage" title="刷新" :icon="h(ReloadOutlined)">
                </a-button>
            </nav>
        </div>

        <div class="title-bar-center"></div>
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
                        <!-- 后面的矩形，只显示未被遮挡的部分 -->
                        <path d="M4 1 L10 1 L10 4 L8 4 L8 3 L4 3 Z" fill="none" stroke="currentColor"
                            stroke-width="1" />
                        <path d="M8 4 L10 4 L10 7 L8 7 Z" fill="none" stroke="currentColor" stroke-width="1" />
                        <!-- 前面的矩形 -->
                        <rect x="2" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
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
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isLoggedIn, logout } from '../utils/auth'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import { useAppStore } from '../stores/app'
import { message } from 'ant-design-vue'
import { UserOutlined, LogoutOutlined, ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined, StarFilled, SettingFilled, DownloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { goBack, goForward } from '@/router/go'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const appStore = useAppStore()
const isMaximized = ref(false)

// 检查是否有可用更新
const hasUpdate = computed(() => appStore.hasUpdate)
const currentWindow = getCurrentWindow()

const isLoggedInComputed = computed(() => isLoggedIn())
const userInfo = computed(() => userStore.userInfo)

// 注入全局刷新方法
const refreshCurrentRoute = inject('refreshCurrentRoute')


// 刷新功能
const refreshPage = () => {
    // 使用全局的刷新方法，通过改变 key 强制重新渲染组件
    if (refreshCurrentRoute) {
        refreshCurrentRoute()
    } else {
        // 回退方案
        router.go(0)
    }
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

// 获取头像完整URL
const getAvatarUrl = (avatar) => {
    if (!avatar) return '/logo.png'
    if (avatar.startsWith('http')) return avatar
    return `https://s3.mangafuna.xyz/${avatar}`
}

// 切换账号
const switchAccount = (username) => {
    const account = userStore.switchToAccount(username)
    if (account) {
        message.info(`哈喽，${account.userInfo.nickname || username}，切换账号后，个人收藏数据等需要刷新才能看到当前账号的信息哦`)
    } else {
        message.error('切换账号失败，请重新登录')
    }
}

// 添加新账号
const addNewAccount = () => {
    // 临时禁用自动登录，避免在添加账号时自动登录
    const originalAutoLogin = userStore.autoLogin
    userStore.setAutoLogin(false)

    // 跳转到登录页面，并在URL中添加参数表示这是添加账号操作
    router.push('/login?action=add-account').then(() => {
        // 页面跳转完成后，恢复原来的自动登录设置
        setTimeout(() => {
            userStore.setAutoLogin(originalAutoLogin)
        }, 1000)
    })
}
</script>

<style src="../assets/styles/title-bar.scss" lang="scss" scoped></style>
