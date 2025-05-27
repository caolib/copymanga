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
                            <template #icon><cloud-server-outlined /></template>
                            服务设置
                        </a-menu-item>
                        <a-menu-item key="appearance">
                            <template #icon><skin-outlined /></template>
                            界面设置
                        </a-menu-item>
                        <a-menu-item key="about">
                            <template #icon><info-circle-outlined /></template>
                            关于
                        </a-menu-item>
                    </a-menu>
                </div>

                <!-- 主要内容区域 -->
                <div class="settings-content">
                    <!-- 服务设置 -->
                    <div v-if="selectedMenu[0] === 'server'">
                        <h2 class="settings-section-title">服务设置</h2>
                        <a-card title="转发服务配置" class="setting-card" id="server-config">
                            <a-form :model="serverForm" layout="vertical" @finish="onSubmitServer">
                                <a-form-item label="服务器端口（1-65535）" name="serverPort" :rules="[
                                    { required: true, message: '请输入服务器端口' },
                                    { validator: validatePort, trigger: 'blur' }
                                ]">
                                    <a-input-number v-model:value="serverForm.serverPort" placeholder="5001"
                                        size="large" :min="1" :max="65535" style="width: 100%" />
                                </a-form-item>

                                <a-form-item>
                                    <a-space>
                                        <a-button type="primary" html-type="submit" :loading="savingServer"
                                            size="large">
                                            保存设置
                                        </a-button>
                                        <a-button @click="resetServerToDefault" size="large">
                                            恢复默认
                                        </a-button>
                                    </a-space>
                                </a-form-item>
                            </a-form>
                        </a-card>

                        <a-card title="API 域名配置" class="setting-card" id="api-config">
                            <a-form :model="appForm" layout="vertical" @finish="onSubmitApp">
                                <a-form-item label="API 域名" name="apiDomain" :rules="[
                                    { required: true, message: '请输入 API 域名' },
                                    { validator: validateDomain, trigger: 'blur' }
                                ]">
                                    <a-input v-model:value="appForm.apiDomain" placeholder="https://copy20.com"
                                        size="large" />
                                    <div class="help-text">
                                        默认: https://copy20.com
                                    </div>
                                </a-form-item>

                                <a-form-item>
                                    <a-space>
                                        <a-button type="primary" html-type="submit" :loading="savingApp" size="large">
                                            保存设置
                                        </a-button>
                                        <a-button @click="resetAppToDefault" size="large">
                                            恢复默认
                                        </a-button>
                                    </a-space>
                                </a-form-item>
                            </a-form>
                        </a-card>

                        <a-card title="当前状态" class="setting-card" id="status">
                            <a-descriptions :column="1">
                                <a-descriptions-item label="转发服务器">
                                    http://localhost:{{ currentServerPort }}
                                </a-descriptions-item>
                                <a-descriptions-item label="API 域名">
                                    {{ currentApiDomain }}
                                </a-descriptions-item>
                            </a-descriptions>

                            <a-divider />

                            <div class="restart-section">
                                <a-alert v-if="appStore.needsRestart" type="warning" message="配置已更改，需要重启应用以生效" show-icon
                                    style="margin-bottom: 16px" />
                                <a-space>
                                    <a-button type="primary" @click="handleRestart" :loading="restarting" size="large"
                                        danger>
                                        <template #icon>
                                            <reload-outlined />
                                        </template>
                                        重启应用
                                    </a-button>
                                    <span class="restart-help">重启应用以应用所有配置更改</span>
                                </a-space>
                            </div>
                        </a-card>
                    </div>

                    <!-- 界面设置 -->
                    <div v-if="selectedMenu[0] === 'appearance'">
                        <h2 class="settings-section-title">界面设置（待完成）</h2>
                        <a-card title="主题设置" class="setting-card">
                            <a-form layout="vertical">
                                <a-form-item label="颜色主题">
                                    <a-radio-group v-model:value="themeMode" button-style="solid">
                                        <a-radio-button value="light">浅色</a-radio-button>
                                        <a-radio-button value="dark">深色</a-radio-button>
                                        <a-radio-button value="system">跟随系统</a-radio-button>
                                    </a-radio-group>
                                </a-form-item>

                                <a-form-item label="字体大小">
                                    <a-slider v-model:value="fontSize" :min="12" :max="20" :step="1" />
                                    <div class="help-text">
                                        默认: 14px
                                    </div>
                                </a-form-item>
                            </a-form>
                        </a-card>

                        <a-card title="阅读设置" class="setting-card">
                            <a-form layout="vertical">
                                <a-form-item label="阅读方向">
                                    <a-radio-group v-model:value="readDirection" button-style="solid">
                                        <a-radio-button value="rtl">从右到左</a-radio-button>
                                        <a-radio-button value="ltr">从左到右</a-radio-button>
                                        <a-radio-button value="scroll">垂直滚动</a-radio-button>
                                    </a-radio-group>
                                </a-form-item>
                            </a-form>
                        </a-card>
                    </div>

                    <!-- 关于 -->
                    <div v-if="selectedMenu[0] === 'about'">
                        <h2 class="settings-section-title">关于应用</h2>
                        <a-card class="setting-card">
                            <div class="about-container">
                                <div class="about-logo">
                                    <img src="/logo.png" alt="CopyManga" class="app-logo" />
                                </div>
                                <h3>拷贝漫画</h3>
                                <p class="version">版本 {{ appVersion }}</p>

                                <a-divider />

                                <p>拷贝漫画是基于官方API的第三方客户端，旨在提供更好的漫画阅读体验。</p>
                                <p>本应用仅供学习交流使用，所有内容版权归原作者所有。</p>
                                <p class="repo-link">
                                    <span>仓库地址：</span>
                                    <a @click="openRepository"
                                        class="repo-link-text">https://github.com/caolib/copymanga</a>
                                </p>

                                <a-space style="margin-top: 16px">
                                    <a-button type="primary">检查更新</a-button>
                                    <a-button @click="openFeedback">贡献反馈</a-button>
                                </a-space>
                            </div>
                        </a-card>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
    ReloadOutlined,
    CloudServerOutlined,
    ApiOutlined,
    DashboardOutlined,
    SkinOutlined,
    SettingOutlined,
    InfoCircleOutlined
} from '@ant-design/icons-vue'
import {
    getServerConfig,
    saveServerConfig,
    validateServerPort,
    getAppConfig,
    saveAppConfig,
    validateApiDomain
} from '@/utils/server-config'
import { useAppStore } from '@/stores/app'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'

const serverForm = ref({
    serverPort: 5001
})

const appForm = ref({
    apiDomain: 'https://copy20.com'
})

const currentServerPort = ref('5001')
const currentApiDomain = ref('https://copy20.com')
const savingServer = ref(false)
const savingApp = ref(false)
const restarting = ref(false)
const appStore = useAppStore()
const selectedMenu = ref(['server']) // 当前选中的菜单项

// 界面设置
const themeMode = ref('light')
const fontSize = ref(14)
const readDirection = ref('rtl')


// 关于页面信息
const appVersion = ref('')

// 验证端口格式
const validatePort = (rule, value) => {
    if (!value) {
        return Promise.reject('请输入服务器端口')
    }
    if (!validateServerPort(value)) {
        return Promise.reject('请输入有效的端口号 (1-65535)')
    }
    return Promise.resolve()
}

// 验证域名格式
const validateDomain = (rule, value) => {
    if (!value) {
        return Promise.reject('请输入 API 域名')
    }
    if (!validateApiDomain(value)) {
        return Promise.reject('请输入有效的域名 (如: https://copy20.com)')
    }
    return Promise.resolve()
}

// 加载当前配置
const loadConfig = () => {
    // 加载服务器配置
    getServerConfig().then(config => {
        serverForm.value.serverPort = parseInt(config.serverPort)
        currentServerPort.value = config.serverPort
    }).catch(error => {
        console.error('加载服务器配置失败:', error)
        message.error('加载服务器配置失败')
    })

    // 加载应用配置
    getAppConfig().then(config => {
        appForm.value.apiDomain = config.apiDomain
        currentApiDomain.value = config.apiDomain
    }).catch(error => {
        console.error('加载应用配置失败:', error)
        message.error('加载应用配置失败')
    })
}

// 保存服务器配置
const onSubmitServer = () => {
    savingServer.value = true

    saveServerConfig(serverForm.value.serverPort.toString()).then(() => {
        currentServerPort.value = serverForm.value.serverPort.toString()
        appStore.setNeedsRestart(true)
        message.success('服务器配置保存成功！')
    }).catch(error => {
        message.error(error.message || '保存服务器配置失败')
    }).finally(() => {
        savingServer.value = false
    })
}

// 保存应用配置
const onSubmitApp = () => {
    savingApp.value = true

    saveAppConfig(appForm.value.apiDomain).then(() => {
        currentApiDomain.value = appForm.value.apiDomain
        appStore.setNeedsRestart(true)
        message.success('API 配置保存成功！')
        message.info('请重启应用以使新的 API 配置生效', 3)
    }).catch(error => {
        message.error(error.message || '保存 API 配置失败')
    }).finally(() => {
        savingApp.value = false
    })
}

// 重置为默认值
const resetServerToDefault = () => {
    serverForm.value.serverPort = 5001
}

const resetAppToDefault = () => {
    appForm.value.apiDomain = 'https://copy20.com'
}

// 处理重启应用
const handleRestart = async () => {
    restarting.value = true
    try {
        await appStore.restartApp()
    } catch (error) {
        console.error('重启失败:', error)
        message.error('重启应用失败，请手动重启')
    } finally {
        restarting.value = false
    }
}


// 通用打开URL函数
const openExternalUrl = (url, errorMsg = '打开链接失败') => {
    invoke('open_browser', { url })
        .catch(err => {
            console.error(`${errorMsg}:`, err)
            message.error(`${errorMsg}，尝试使用默认浏览器打开`)
            // 作为备选方案，尝试使用浏览器原生方法
            window.open(url, '_blank')
        })
}

// 打开仓库地址
const openRepository = () => {
    const repoUrl = 'https://github.com/caolib/copymanga'
    openExternalUrl(repoUrl, '打开仓库地址失败')
}

// 打开反馈页面
const openFeedback = () => {
    const feedbackUrl = 'https://github.com/caolib/copymanga/issues'
    openExternalUrl(feedbackUrl, '打开反馈页面失败')
}

// 获取应用版本
const fetchAppVersion = () => {
    getVersion().then(version => {
        appVersion.value = version
    }).catch(err => {
        console.error('获取应用版本失败:', err)
        appVersion.value = 'error🥲'
    })
}

onMounted(() => {
    loadConfig()
    fetchAppVersion()
})
</script>

<style scoped>
.settings-view {
    min-height: 100vh;
    background-color: #f5f5f5;
    padding: 0;
}

.settings-container {
    width: 100%;
}

.settings-layout {
    display: flex;
    position: relative;
}

.settings-sidebar {
    width: 200px;
    background: #fff;
    border-right: 1px solid #f0f0f0;
    min-height: 100vh;
    position: fixed;
    left: 0;
    z-index: 10;
}

.settings-title {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
}

.settings-content {
    flex: 1;
    padding: 24px;
    margin-left: 200px;
}

.setting-card {
    margin-bottom: 24px;
    scroll-margin-top: 20px;
}

.settings-section-title {
    font-size: 22px;
    font-weight: 500;
    margin-bottom: 24px;
    color: #333;
}

.about-container {
    text-align: center;
    padding: 20px;
}

.about-logo {
    margin-bottom: 16px;
}

.app-logo {
    width: 80px;
    height: 80px;
}

.version {
    color: #999;
    margin-top: 8px;
}

.repo-link {
    margin-top: 12px;
    font-size: 14px;
}

.repo-link a {
    color: #1890ff;
    text-decoration: none;
    cursor: pointer;
}

.repo-link a:hover {
    text-decoration: underline;
}

.help-text {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

h1 {
    margin: 0;
    color: #333;
    font-size: 20px;
}

.restart-section {
    text-align: center;
}

.restart-help {
    color: #666;
    font-size: 14px;
    margin-left: 8px;
}
</style>
