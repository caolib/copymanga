<template>
    <div class="settings-view">
        <div class="settings-container">
            <div class="settings-layout">
                <!-- 侧边栏导航 -->
                <div class="settings-sidebar">
                    <div class="settings-title">
                        <h1>设置</h1>
                    </div>
                    <a-menu v-model:selectedKeys="selectedMenu" mode="inline" style="border-right: 0">
                        <a-menu-item key="server">
                            <template #icon>
                                <CloudServerOutlined />
                            </template>
                            服务设置
                        </a-menu-item>
                        <a-menu-item key="appearance">
                            <template #icon>
                                <SkinOutlined />
                            </template>
                            界面设置
                        </a-menu-item>
                        <a-menu-item key="about">
                            <template #icon>
                                <InfoCircleOutlined />
                            </template>
                            <div class="menu-item-content">
                                关于
                                <span v-if="hasUpdate" class="update-indicator"></span>
                            </div>
                        </a-menu-item>
                    </a-menu>
                </div>

                <!-- 主要内容区域 -->
                <div class="settings-content">
                    <!-- 服务设置 -->
                    <ServerSettings v-if="selectedMenu[0] === 'server'" />

                    <!-- 界面设置 -->
                    <AppearanceSettings v-if="selectedMenu[0] === 'appearance'" />

                    <!-- 关于 -->
                    <AboutSettings v-if="selectedMenu[0] === 'about'" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
    CloudServerOutlined,
    SkinOutlined,
    InfoCircleOutlined
} from '@ant-design/icons-vue'
import ServerSettings from '@/components/settings/ServerSettings.vue'
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue'
import AboutSettings from '@/components/settings/AboutSettings.vue'
import { useAppStore } from '@/stores/app'

const selectedMenu = ref(['server']) // 当前选中的菜单项
const appStore = useAppStore()

// 检查是否有可用更新
const hasUpdate = computed(() => appStore.hasUpdate)
</script>

<style src="../assets/styles/settings.scss" scoped></style>
