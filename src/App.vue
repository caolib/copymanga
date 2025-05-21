<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, logout } from './utils/auth'

const router = useRouter()

const isLoggedInComputed = computed(() => isLoggedIn())

const handleLogout = () => {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content">
        <h1 class="logo">漫画阅读器</h1>
        <nav class="nav">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/my-collection" class="nav-link" v-if="isLoggedInComputed">我的书架</router-link>
          <template v-if="isLoggedInComputed">
            <a href="javascript:;" class="nav-link" @click="handleLogout">退出登录</a>
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link">登录</router-link>
          </template>
        </nav>
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
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.main-content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
