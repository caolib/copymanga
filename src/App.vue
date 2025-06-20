<script setup>
import { computed, ref, watchEffect, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import { useThemeStore } from './stores/theme'
import TitleBar from './components/TitleBar.vue'
import { theme } from 'ant-design-vue'
import { checkUpdateOnStartup } from './utils/auto-update'
import { restartApp } from './utils/restart-helper'

const route = useRoute()
const appStore = useAppStore()
const themeStore = useThemeStore()
const showHeader = ref(true)
const routerKey = ref(0)

// 主题配置
const themeConfig = computed(() => {
  const baseToken = {
    colorPrimary: '#1677ff',
  }

  // 暗色主题特定配置
  const darkToken = {
    ...baseToken,
    colorPrimaryBg: '#282c34',
    colorPrimaryBgHover: '#282c34',
    colorBgContainer: '#282c34',
    colorBgElevated: '#3a3f4b',
    colorBorder: '#444444',
    colorBorderSecondary: '#333333',
    colorText: '#e0e0e0',
    colorTextSecondary: '#cccccc',
    colorTextTertiary: '#999999',
    colorFill: '#3a3f4b',
    colorFillSecondary: '#2f343e',
    colorFillTertiary: '#262a33',
    colorFillQuaternary: '#1f2329',
  }

  return {
    algorithm: themeStore.isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: themeStore.isDarkMode ? darkToken : baseToken,
  }
})

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

// 检测当前是否在漫画阅读页面或动画播放页面
const isReaderRoute = computed(() => {
  return route.name === 'ChapterReader' || route.name === 'CartoonPlayer'
})

// 处理鼠标移动事件
const handleMouseMove = (event) => {
  // 只在阅读页面处理该逻辑
  if (!isReaderRoute.value) return;

  // 当鼠标在页面顶部 60px 范围内时显示导航栏
  if (event.clientY <= 60) {
    showHeader.value = true;
  } else {
    showHeader.value = false;
  }
}

// 监听路由变化，在阅读页面隐藏顶部栏
watchEffect(() => {
  if (isReaderRoute.value) {
    showHeader.value = false
  } else {
    showHeader.value = true
  }
})

// 重启应用
const handleRestart = restartApp

// 刷新当前路由
const refreshCurrentRoute = () => {
  routerKey.value += 1
}

// 将刷新方法注入到全局
provide('refreshCurrentRoute', refreshCurrentRoute)

// 组件挂载时检查免责声明和初始化主题
onMounted(async () => {
  checkDisclaimer()
  await themeStore.initTheme()

  // 如果启用了自动检查更新，在启动时检查一次
  if (appStore.autoCheckUpdate) {
    setTimeout(() => {
      checkUpdateOnStartup()
    }, 3000) // 延迟3秒执行，避免影响应用启动速度
  }
})
</script>

<template>
  <a-config-provider :theme="themeConfig">
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
        <!-- 内容包装器 -->
        <div class="content-wrapper">
          <!-- 路由视图 -->
          <router-view :key="routerKey" />
        </div>
      </main>

      <!-- 免责声明弹窗 -->
      <a-modal v-model:open="showDisclaimer" title="重要声明" :closable="false" :maskClosable="false" width="600px"
        centered>
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
              本应用不承担因使用本软件而产生的任何法律责任，未成年人应在监护人指导下使用。
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
  </a-config-provider>
</template>

<style src='./assets/styles/app.scss' lang="scss"></style>
