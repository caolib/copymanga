<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, logout, getUserInfo } from './utils/auth'
import { useUserStore } from './stores/user'
import { useAppStore } from './stores/app'


const router = useRouter()
const showUserMenu = ref(false)
const userStore = useUserStore()
const appStore = useAppStore()

const isLoggedInComputed = computed(() => isLoggedIn())
const userInfo = computed(() => userStore.userInfo)

// 组件挂载时获取用户信息
onMounted(async () => {
  if (isLoggedInComputed.value) {
    try {
      await userStore.fetchUserInfo();
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  }
})

const handleLogout = () => {
  logout()
  router.push('/login')
  showUserMenu.value = false
}

const goToProfile = () => {
  router.push('/profile')
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

// 点击外部关闭菜单
const closeUserMenu = () => {
  showUserMenu.value = false
}
</script>

<template>
  <div class="app-container" @click="closeUserMenu">
    <!-- 重启提示横幅 -->
    <div v-if="appStore.needsRestart" class="restart-banner">
      <a-alert message="配置已更改" description="服务器配置已更新，请重启应用以使更改生效。" type="warning" show-icon closable
        @close="appStore.setNeedsRestart(false)" />
    </div>

    <header class="header">
      <div class="header-content">
        <nav class="nav">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/my-collection" class="nav-link" v-if="isLoggedInComputed">我的书架</router-link>
          <router-link to="/settings" class="nav-link">设置</router-link>
        </nav>

        <div class="user-section">
          <template v-if="isLoggedInComputed">
            <a-dropdown trigger="hover" placement="bottomRight">
              <span class="user-avatar-dropdown">
                <a-avatar :src="userInfo?.avatar || '/logo.jpg'"
                  :alt="userInfo?.nickname || userInfo?.username || '用户头像'" size="32" />
              </span>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile" @click="goToProfile">
                    <span class="menu-icon"></span> 个人中心
                  </a-menu-item>
                  <a-menu-item key="logout" @click="handleLogout">
                    <span class="menu-icon"></span> 退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link">登录</router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="main-content">
      <!-- 路由视图 -->
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-section {
  display: flex;
  align-items: center;
  height: 40px;
}

.user-avatar-dropdown {
  display: flex;
  align-items: center;
  height: 32px;
  cursor: pointer;
}

.a-avatar,
.user-avatar-dropdown .ant-avatar {
  vertical-align: middle;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  transition: border-color 0.2s;
}

.user-avatar:hover {
  border-color: #4caf50;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  z-index: 1000;
  overflow: hidden;
  animation: fadeInDown 0.2s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-menu-header {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-menu-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.user-menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu-info {
  flex: 1;
}

.username {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.user-desc {
  font-size: 12px;
  opacity: 0.8;
}

.user-menu-divider {
  height: 1px;
  background: #f0f0f0;
}

.user-menu-items {
  padding: 8px 0;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s;
}

.user-menu-item:hover {
  background-color: #f5f5f5;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}


.app-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  text-decoration: none;
}

.nav {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-link {
  color: #666;
  text-decoration: none;
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #333;
  background-color: #f5f5f5;
}

.router-link-active {
  color: #4caf50;
  font-weight: 500;
}

/* 重启提示横幅样式 */
.restart-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  margin-bottom: 0;
}

.restart-banner .ant-alert {
  border-radius: 0;
  border-left: none;
  border-right: none;
  margin-bottom: 0;
}

.main-content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
