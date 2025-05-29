<template>
    <div>
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
                    <a-alert message="使用声明" description="本应用是基于拷贝漫画官方API的第三方客户端，仅供学习交流使用。所有漫画内容版权归原作者和平台所有。" type="info"
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
                        <a-button type="link" size="small" @click="openChangelogUrl" style="padding: 0; height: auto;">
                            查看完整更新日志 →
                        </a-button>
                    </div>
                </div>
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
    GithubOutlined,
    BugOutlined,
    DownloadOutlined,
    SyncOutlined
} from '@ant-design/icons-vue'
import { getVersion } from '@tauri-apps/api/app'
import { open } from '@tauri-apps/plugin-shell'
import { checkForUpdates } from '@/api/github'

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

// 通用打开URL函数
const openExternalUrl = (url, errorMsg = '打开链接失败') => {
    open(url).catch(error => {
        console.error('打开链接失败:', error)
        message.error(errorMsg)
    })
}

// 打开仓库地址
const openRepository = () => {
    openExternalUrl('https://github.com/caolib/copymanga', '打开项目仓库失败')
}

// 打开反馈页面
const openFeedback = () => {
    openExternalUrl('https://github.com/caolib/copymanga/issues', '打开反馈页面失败')
}

// 获取应用版本
const fetchAppVersion = () => {
    getVersion().then(version => {
        appVersion.value = version
        updateInfo.value.currentVersion = version
    }).catch(error => {
        console.error('获取应用版本失败:', error)
        appVersion.value = '未知'
    })
}

// 检查更新
const checkUpdate = async () => {
    checkingUpdate.value = true
    lastCheckTime.value = new Date().toLocaleString()

    checkForUpdates().then(result => {
        updateInfo.value = {
            hasUpdate: result.hasUpdate,
            currentVersion: result.currentVersion,
            latestVersion: result.latestVersion,
            release: result.release
        }

        if (result.hasUpdate) {
            message.success('发现新版本！')
        } else {
            message.info('当前已是最新版本')
        }
    }).catch(error => {
        console.error('检查更新失败:', error)
        message.error('检查更新失败，请检查网络连接')
    }).finally(() => {
        checkingUpdate.value = false
    })
}

// 打开下载页面
const openDownloadPage = () => {
    openExternalUrl('https://github.com/caolib/copymanga/releases/latest', '打开下载页面失败')
}

// 打开完整更新日志
const openChangelogUrl = () => {
    if (updateInfo.value.release?.html_url) {
        openExternalUrl(updateInfo.value.release.html_url, '打开更新日志失败')
    }
}

// 格式化更新日志
const formatChangeLog = (body) => {
    if (!body) return ''

    // 简单的markdown转换，只显示前几行
    const lines = body.split('\n').slice(0, 10)
    return lines
        .map(line => {
            if (line.startsWith('##')) {
                return `<h3>${line.replace('##', '').trim()}</h3>`
            }
            if (line.startsWith('- ')) {
                return `<li>${line.replace('- ', '').trim()}</li>`
            }
            if (line.trim()) {
                return `<p>${line.trim()}</p>`
            }
            return ''
        })
        .filter(line => line)
        .join('')
}

// 格式化发布日期
const formatReleaseDate = (dateString) => {
    return new Date(dateString).toLocaleString()
}

onMounted(() => {
    fetchAppVersion()
})
</script>

<style scoped>
.about-container {
    max-width: 600px;
}

.about-header {
    display: flex;
    align-items: center;
    gap: 16px;
}

.about-logo .app-logo {
    width: 64px;
    height: 64px;
    border-radius: 8px;
}

.about-info h3 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
}

.description {
    color: #666;
    margin: 0;
}

.links-section {
    margin: 16px 0;
}

.disclaimer {
    margin-top: 16px;
}

.update-section {
    max-width: 700px;
}

.changelog-content {
    background: #f9f9f9;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e8e8e8;
    max-height: 300px;
    overflow-y: auto;
}

.changelog-content h3 {
    margin: 0 0 8px 0;
    color: #333;
}

.changelog-content :deep(.changelog-list) {
    list-style: none;
    padding: 0;
    margin: 0;
}

.changelog-content :deep(.commit-item) {
    margin-bottom: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
}

.changelog-content :deep(.changelog-item) {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 4px;
}

.changelog-content :deep(.commit-hash) {
    font-family: 'Courier New', monospace;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    color: #666;
    flex-shrink: 0;
}

.changelog-content :deep(.commit-message) {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
}

.changelog-content :deep(a) {
    color: #1890ff;
    text-decoration: none;
}

.changelog-content :deep(a:hover) {
    text-decoration: underline;
}
</style>
