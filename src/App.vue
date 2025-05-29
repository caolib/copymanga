<script setup>
import { computed, ref, watchEffect, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import { relaunch } from '@tauri-apps/plugin-process'
import TitleBar from './components/TitleBar.vue'
import { Modal } from 'ant-design-vue'

const route = useRoute()
const appStore = useAppStore()
const showHeader = ref(true)

// 免责声明相关
const showDisclaimer = ref(false)

// 检查是否需要显示免责声明
const checkDisclaimer = () => {
  if (!appStore.disclaimerAccepted) {
    showDisclaimer.value = true
  }
}

// 接受免责声明
const acceptDisclaimer = () => {
  appStore.setDisclaimerAccepted(true)
  showDisclaimer.value = false
}

// 拒绝免责声明
const rejectDisclaimer = () => {
  // 退出应用
  window.close()
}

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

// 组件挂载时检查免责声明
onMounted(() => {
  checkDisclaimer()
})
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

    <!-- 免责声明弹窗 -->
    <a-modal v-model:open="showDisclaimer" title="重要声明" :closable="false" :maskClosable="false" width="600px" centered>
      <div class="disclaimer-content">
        <div class="warning-header">
          <div class="warning-icon">⚠️</div>
          <h3>内容风险提醒</h3>
        </div>

        <div class="disclaimer-text">
          <p><strong>请仔细阅读以下声明：</strong></p>
          <ul>
            <li>本应用可能包含不适宜未成年人观看的内容</li>
            <li>部分内容可能涉及暴力、血腥、恐怖或成人题材</li>
            <li>用户需自行判断内容的适宜性并承担相应责任</li>
            <li>如发现违法违规内容，请立即停止使用并举报</li>
          </ul>

          <p class="age-notice">
            <strong>年龄限制：</strong>使用本应用即表示您已年满18周岁，并同意遵守当地法律法规。
          </p>

          <p class="legal-notice">
            本应用不承担因使用本软件而产生的任何法律责任。未成年人应在监护人指导下使用。
          </p>
        </div>
      </div>

      <template #footer>
        <div class="disclaimer-footer">
          <a-button type="default" @click="rejectDisclaimer">
            不同意并退出
          </a-button>
          <a-button type="primary" @click="acceptDisclaimer">
            我已年满18周岁，同意并继续
          </a-button>
        </div>
      </template>
    </a-modal>
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

/* 免责声明弹窗样式 */
.disclaimer-content {
  padding: 16px 0;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fff2e8;
  border: 1px solid #ffcc02;
  border-radius: 8px;
}

.warning-icon {
  font-size: 24px;
}

.warning-header h3 {
  margin: 0;
  color: #d46b08;
  font-size: 18px;
}

.disclaimer-text {
  line-height: 1.6;
  color: #333;
}

.disclaimer-text ul {
  margin: 16px 0;
  padding-left: 20px;
}

.disclaimer-text li {
  margin-bottom: 8px;
}

.age-notice {
  background: #f6ffed;
  padding: 12px;
  border-left: 4px solid #52c41a;
  margin: 16px 0;
  font-weight: 500;
}

.legal-notice {
  background: #fff1f0;
  padding: 12px;
  border-left: 4px solid #ff4d4f;
  margin: 16px 0;
  color: #cf1322;
  font-size: 13px;
}

.disclaimer-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.disclaimer-footer .ant-btn {
  flex: 1;
}
</style>
