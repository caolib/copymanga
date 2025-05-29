<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import { relaunch } from '@tauri-apps/plugin-process'
import TitleBar from './components/TitleBar.vue'

const route = useRoute()
const appStore = useAppStore()
const showHeader = ref(true)

// 检测当前是否在漫画阅读页面
const isChapterReaderRoute = computed(() => {
  return route.name === 'ChapterReader'
})

// 处理鼠标移动事件
const handleMouseMove = (event) => {
  // 只在漫画阅读页面处理该逻辑
  if (!isChapterReaderRoute.value) return;

  // 当鼠标在页面顶部 60px 范围内时显示导航栏
  if (event.clientY <= 60) {
    showHeader.value = true;
  } else {
    showHeader.value = false;
  }
}

// 监听路由变化，在漫画阅读页面隐藏顶部栏
watchEffect(() => {
  if (isChapterReaderRoute.value) {
    showHeader.value = false
  } else {
    showHeader.value = true
  }
})

// 重启应用
const handleRestart = async () => {
  await relaunch().then(() => {
    appStore.setNeedsRestart(false)
  })
}
</script>

<template>
  <div class="app-container" @mousemove="handleMouseMove">
    <!-- 自定义标题栏 -->
    <TitleBar v-show="showHeader" />

    <!-- 重启提示横幅 -->
    <div v-if="appStore.needsRestart" class="restart-banner">
      <a-alert type="warning" show-icon closable @close="appStore.setNeedsRestart(false)">
        <template #message>
          <span>配置已更改</span>
        </template>
        <template #description>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>服务器配置已更新，请重启应用以使更改生效。</span>
            <a-button type="primary" size="small" @click="handleRestart" style="margin-left: 12px;">
              立即重启
            </a-button>
          </div>
        </template>
      </a-alert>
    </div>

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
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.restart-banner {
  padding: 8px 16px;
  background-color: #fff3cd;
  border-bottom: 1px solid #ffeaa7;
  z-index: 999;
  margin-top: 50px;
  /* 为标题栏留出空间 */
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 70px 20px 20px 20px;
  /* 上边距为标题栏高度 + 20px */
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 在漫画阅读页面调整主内容区域 */
.chapter-reader-mode .main-content {
  padding: 0;
  max-width: none;
}
</style>
