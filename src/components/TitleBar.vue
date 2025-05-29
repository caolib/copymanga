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
                </template>
                <template v-else>
                    <router-link to="/login" class="nav-link login-link">登录</router-link>
                </template>
            </div>

            <!-- 导航栏 -->
            <nav class="nav" data-tauri-drag-region="false">
                <router-link to="/" class="nav-link">首页</router-link>
                <router-link to="/my-collection" class="nav-link" v-if="isLoggedInComputed">我的书架</router-link>
                <router-link to="/settings" class="nav-link">设置</router-link>
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
import { UserOutlined, LogoutOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const isMaximized = ref(false)
const currentWindow = getCurrentWindow()

const isLoggedInComputed = computed(() => isLoggedIn())
const userInfo = computed(() => userStore.userInfo)

onMounted(async () => {
    // 监听窗口状态变化
    const unlisten = await currentWindow.onResized(async () => {
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

    // 组件销毁时清理监听器
    onUnmounted(() => {
        unlisten()
    })
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

<style scoped>
.title-bar {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 50px;
    background: white;
    color: #333;
    user-select: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    border-bottom: 1px solid #e0e0e0;
    padding: 0 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title-bar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.app-title {
    font-size: 14px;
    font-weight: 500;
    margin-right: 8px;
}

.title-bar-center {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    /* 用于拖动的空白区域 */
}

.nav {
    display: flex;
    gap: 20px;
}

.nav-link {
    color: #666;
    text-decoration: none;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 16px;
    transition: all 0.3s ease;
    font-size: 14px;
}

.nav-link:hover {
    background-color: #f5f5f5;
    color: #333;
}

.nav-link.router-link-active {
    background-color: #e6f7ff;
    color: #1890ff;
}

.login-link {
    background-color: #1890ff;
    color: white;
    border: 1px solid #1890ff;
}

.login-link:hover {
    background-color: #40a9ff;
    color: white;
}

.title-bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
    justify-content: flex-end;
}

.user-section {
    display: flex;
    align-items: center;
    margin-right: 12px;
}

.user-avatar-dropdown {
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.3s ease;
    padding: 2px;
    border: 2px solid #e0e0e0;
}

.user-avatar-dropdown:hover {
    background-color: #f5f5f5;
    border-color: #1890ff;
    transform: scale(1.05);
}

.window-controls {
    display: flex;
    align-items: center;
}

.title-bar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.title-bar-button:hover {
    background-color: #f5f5f5;
}

.title-bar-button.close:hover {
    background-color: #ff4d4f;
    color: white;
}

.title-bar-button.maximize:hover,
.title-bar-button.minimize:hover {
    background-color: #e6f7ff;
    color: #1890ff;
}

.title-bar-button svg {
    pointer-events: none;
}

.menu-icon {
    font-size: 14px;
    margin-right: 8px;
}

/* 媒体查询：在较小屏幕上调整布局 */
@media (max-width: 768px) {
    .nav {
        gap: 12px;
    }

    .nav-link {
        padding: 4px 8px;
        font-size: 13px;
    }

    .app-title {
        display: none;
    }
}
</style>
