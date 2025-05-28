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
                                            <ReloadOutlined />
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
                        <h2 class="settings-section-title">界面设置</h2>

                        <!-- 阅读器设置 -->
                        <a-card title="阅读器设置" class="setting-card">
                            <a-form layout="vertical">
                                <a-form-item label="漫画布局">
                                    <a-radio-group v-model:value="uiConfig.layout" button-style="solid">
                                        <a-radio-button value="rtl">从右到左（日漫风格）</a-radio-button>
                                        <a-radio-button value="ltr">从左到右</a-radio-button>
                                    </a-radio-group>
                                </a-form-item>

                                <a-form-item label="每行列数">
                                    <a-slider v-model:value="uiConfig.columnsPerRow" :min="1" :max="4" :step="1"
                                        :marks="{ 1: '1列', 2: '2列', 3: '3列', 4: '4列' }" />
                                </a-form-item>

                                <a-form-item label="图片大小">
                                    <a-slider v-model:value="uiConfig.imageSize" :min="50" :max="150" :step="10"
                                        :marks="{ 50: '50%', 100: '100%', 150: '150%' }" />
                                </a-form-item>

                                <a-form-item label="图片间距">
                                    <a-slider v-model:value="uiConfig.imageGap" :min="0" :max="30" :step="1"
                                        :marks="{ 0: '0px', 10: '10px', 30: '30px' }" />
                                </a-form-item>

                                <a-form-item>
                                    <a-space>
                                        <a-button type="primary" @click="saveUISettings" :loading="savingUI"
                                            size="large">
                                            保存设置
                                        </a-button>
                                        <a-button @click="resetUIToDefault" size="large">
                                            恢复默认
                                        </a-button>
                                    </a-space>
                                </a-form-item>
                            </a-form>
                        </a-card>
                    </div>

                    <!-- 关于 -->
                    <div v-if="selectedMenu[0] === 'about'">
                        <!-- 应用信息 -->
                        <a-card title="应用信息" class="setting-card">
                            <div class="about-container">
                                <div class="about-header">
                                    <div class="about-logo">
                                        <img src="/logo.png" alt="CopyManga" class="app-logo" />
                                    </div>
                                    <div class="about-info">
                                        <h3>CopyManga</h3>
                                        <div class="description">
                                            基于官方API的第三方漫画客户端
                                        </div>
                                    </div>
                                </div>

                                <a-divider />

                                <div class="links-section">
                                    <a-space wrap>
                                        <a-button type="primary" @click="checkUpdate" :loading="checkingUpdate">
                                            <template #icon>
                                                <SyncOutlined />
                                            </template>
                                            检查更新
                                        </a-button>
                                        <a-button @click="openRepository">
                                            <template #icon>
                                                <GithubOutlined />
                                            </template>
                                            项目仓库
                                        </a-button>
                                        <a-button @click="openFeedback">
                                            <template #icon>
                                                <BugOutlined />
                                            </template>
                                            问题反馈
                                        </a-button>
                                    </a-space>
                                </div>

                                <a-divider />

                                <div class="disclaimer">
                                    <a-alert message="使用声明"
                                        description="本应用是基于拷贝漫画官方API的第三方客户端，仅供学习交流使用。所有漫画内容版权归原作者和平台所有。" type="info"
                                        show-icon />
                                </div>
                            </div>
                        </a-card>

                        <!-- 版本更新 -->
                        <a-card title="版本更新" class="setting-card">
                            <div class="update-section">
                                <a-descriptions :column="1" bordered>
                                    <a-descriptions-item label="当前版本">
                                        <a-tag color="blue">{{ appVersion }}</a-tag>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="最新版本" v-if="updateInfo.latestVersion">
                                        <a-tag :color="updateInfo.hasUpdate ? 'orange' : 'green'">
                                            {{ updateInfo.latestVersion }}
                                        </a-tag>
                                        <a-tag v-if="updateInfo.hasUpdate" color="red" style="margin-left: 8px">
                                            有新版本
                                        </a-tag>
                                        <a-tag v-else color="green" style="margin-left: 8px">
                                            已是最新
                                        </a-tag>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="发布时间" v-if="updateInfo.release?.published_at">
                                        {{ formatReleaseDate(updateInfo.release.published_at) }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="检查时间" v-if="lastCheckTime">
                                        {{ lastCheckTime }}
                                    </a-descriptions-item>
                                </a-descriptions>

                                <div style="margin-top: 16px;">
                                    <a-space wrap>
                                        <a-button v-if="updateInfo.hasUpdate" @click="openDownloadPage" type="default">
                                            <template #icon>
                                                <DownloadOutlined />
                                            </template>
                                            前往下载
                                        </a-button>
                                    </a-space>
                                </div>

                                <!-- 更新详情 -->
                                <div v-if="updateInfo.release && updateInfo.release.body" style="margin-top: 16px;">
                                    <a-divider>更新内容</a-divider>
                                    <div v-html="formatChangeLog(updateInfo.release.body)" class="changelog-content">
                                    </div>
                                    <div style="margin-top: 12px; text-align: right;">
                                        <a-button type="link" size="small" @click="openChangelogUrl"
                                            style="padding: 0; height: auto;">
                                            查看完整更新日志 →
                                        </a-button>
                                    </div>
                                </div>
                            </div>
                        </a-card>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import {
    ReloadOutlined,
    CloudServerOutlined,
    ApiOutlined,
    DashboardOutlined,
    SkinOutlined,
    SettingOutlined,
    InfoCircleOutlined,
    GithubOutlined,
    BugOutlined,
    DownloadOutlined,
    BookOutlined,
    SyncOutlined
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
import { checkForUpdates } from '@/api/github'
import { loadUIConfig, updateReaderConfig, DEFAULT_UI_CONFIG } from '@/utils/ui-config'

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

// UI界面设置
const uiConfig = reactive({ ...DEFAULT_UI_CONFIG.reader })
const savingUI = ref(false)


// 关于页面信息
const appVersion = ref('')

// 版本更新相关
const updateInfo = ref({
    hasUpdate: false,
    currentVersion: '',
    latestVersion: '',
    release: null
})
const checkingUpdate = ref(false)
const lastCheckTime = ref('')

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

    // 加载UI配置
    loadUISettings()
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

// UI配置相关方法
const loadUISettings = () => {
    loadUIConfig().then(config => {
        Object.assign(uiConfig, config.reader)
    }).catch(error => {
        console.error('加载UI配置失败:', error)
        message.error('加载UI配置失败')
    })
}

const saveUISettings = () => {
    savingUI.value = true

    updateReaderConfig(uiConfig).then(success => {
        if (success) {
            message.success('界面设置保存成功！')
        } else {
            message.error('保存界面设置失败')
        }
    }).catch(error => {
        console.error('保存UI配置失败:', error)
        message.error('保存界面设置失败')
    }).finally(() => {
        savingUI.value = false
    })
}

const resetUIToDefault = () => {
    Object.assign(uiConfig, DEFAULT_UI_CONFIG.reader)
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

// 检查更新
const checkUpdate = async () => {
    if (!appVersion.value || appVersion.value === 'error🥲') {
        message.error('无法获取当前版本信息')
        return
    }

    checkingUpdate.value = true

    try {
        const result = await checkForUpdates(appVersion.value)
        console.log('检查更新结果:', result) // 添加调试日志
        updateInfo.value = result
        lastCheckTime.value = new Date().toLocaleString('zh-CN')

        if (result.hasUpdate) {
            message.success(`发现新版本 ${result.latestVersion}！`)
        } else {
            message.info('当前已是最新版本')
        }
    } catch (error) {
        console.error('检查更新失败:', error)
        message.error('检查更新失败，请稍后重试')
    } finally {
        checkingUpdate.value = false
    }
}

// 打开下载页面
const openDownloadPage = () => {
    if (updateInfo.value.release && updateInfo.value.release.html_url) {
        openExternalUrl(updateInfo.value.release.html_url, '打开下载页面失败')
    } else {
        openRepository()
    }
}

// 打开完整更新日志
const openChangelogUrl = () => {
    if (updateInfo.value.release && updateInfo.value.release.html_url) {
        openExternalUrl(updateInfo.value.release.html_url, '打开更新日志失败')
    } else {
        openRepository()
    }
}

// 格式化更新日志
const formatChangeLog = (body) => {
    if (!body) return ''

    // 处理markdown格式的更新日志
    let formatted = body
        .replace(/\r\n/g, '\n')
        .trim()

    // 处理标题 (## 标题)
    formatted = formatted.replace(/^## (.+)$/gm, '<h3 style="color: #1890ff; margin: 16px 0 12px 0; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e8e8e8; padding-bottom: 8px;">$1</h3>')

    // 处理链接 [text](url) - 先处理链接，避免后续处理干扰
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #1890ff; text-decoration: none;">$1</a>')

    // 拆分成行来处理列表
    const lines = formatted.split('\n')
    const processedLines = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.startsWith('- [') && line.includes(']')) {
            // commit格式列表项
            const match = line.match(/^- \[([^\]]+)\]\s*(.+)$/)
            if (match) {
                if (!inList) {
                    processedLines.push('<ul class="changelog-list">')
                    inList = true
                }
                processedLines.push(`<li class="commit-item"><span class="commit-hash">[${match[1]}]</span> <span class="commit-message">${match[2]}</span></li>`)
            }
        } else if (line.startsWith('- ')) {
            // 普通列表项
            if (!inList) {
                processedLines.push('<ul class="changelog-list">')
                inList = true
            }
            processedLines.push(`<li class="changelog-item">${line.substring(2)}</li>`)
        } else {
            // 非列表项
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            if (line) {
                processedLines.push(line)
            } else {
                processedLines.push('<br>')
            }
        }
    }

    // 如果最后还在列表中，关闭列表
    if (inList) {
        processedLines.push('</ul>')
    }

    return processedLines.join('\n')
}

// 格式化发布日期
const formatReleaseDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
    loadConfig()
    fetchAppVersion()
})
</script>

<style scoped>
@import url('../assets/styles/settings.css');

.changelog-content {
    font-size: 14px;
    line-height: 1.6;
    max-height: 300px;
    overflow-y: auto;
    padding: 12px;
    background-color: #fafafa;
    border-radius: 6px;
    border: 1px solid #d9d9d9;
}

.changelog-content h3 {
    border-bottom: 1px solid #e8e8e8;
    padding-bottom: 8px;
    margin-bottom: 12px !important;
}

.changelog-content :deep(.changelog-list) {
    margin: 12px 0;
    padding-left: 20px;
    list-style: none;
}

.changelog-content :deep(.commit-item) {
    padding: 6px 12px;
    margin: 4px 0;
    background-color: #f8f9fa;
    border-left: 3px solid #1890ff;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.changelog-content :deep(.changelog-item) {
    padding: 6px 12px;
    margin: 4px 0;
    background-color: #ffffff;
    border-left: 2px solid #d9d9d9;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.changelog-content :deep(.commit-hash) {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: #52c41a;
    background-color: #e6f7ff;
    padding: 2px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    font-weight: bold;
}

.changelog-content :deep(.commit-message) {
    color: #333;
    flex: 1;
}

.changelog-content :deep(a) {
    color: #1890ff !important;
    text-decoration: none;
}

.changelog-content :deep(a:hover) {
    text-decoration: underline;
}
</style>
