<template>
    <div>
        <!-- 应用信息 -->
        <a-card title="应用信息" class="setting-card">
            <div class="about-container">
                <div class="about-header">
                    <div class="about-logo">
                        <img src="/logo.png" alt="doki" class="app-logo" />
                    </div>
                    <div class="about-info">
                        <h3>doki</h3>
                        <div class="description">
                            doki是一个集漫画、轻小说、动画于一体的桌面应用，提供简洁快速的漫画阅读体验。
                        </div>
                    </div>
                </div>

                <a-divider />

                <div class="links-section">
                    <a-space wrap>
                        <a-button type="primary" @click="checkUpdate" :loading="checkingUpdate" :icon="h(SyncOutlined)">
                            检查更新
                        </a-button>
                        <a-button @click="openRepository" :icon="h(GithubOutlined)">
                            项目仓库
                        </a-button>
                        <a-button @click="openFeedback" :icon="h(BugOutlined)">
                            问题反馈
                        </a-button>
                    </a-space>
                </div>

                <a-divider />
                <div class="disclaimer">
                    <a-alert message="使用声明" type="warning" show-icon style="margin-bottom: 12px;">
                        <template #description>
                            <div>
                                <p>本应用是基于拷贝漫画官方API的第三方客户端，免费无广告，仅供学习交流使用。所有漫画内容版权归原作者和平台所有。</p>
                                <p style="margin-bottom: 0; color: #d46b08; font-weight: 500;">
                                    <strong>⚠️
                                        重要提醒：</strong>本应用可能包含不适宜未成年人观看的内容，请用户自行判断并承担相应责任。使用本应用即表示您已年满18周岁，并同意遵守当地法律法规。
                                </p>
                            </div>
                        </template>
                    </a-alert>
                    <a-alert message="法律声明" type="error" show-icon>
                        <template #description>
                            <div>
                                <p>本应用不承担因使用本软件而产生的任何法律责任。用户在使用过程中应当：</p>
                                <ul style="margin: 8px 0 0 16px; padding-left: 0;">
                                    <li>遵守当地法律法规和相关规定</li>
                                    <li>不得将本应用用于任何非法用途</li>
                                    <li>如发现不合法内容，请立即停止使用并向相关部门举报</li>
                                    <li>未成年人应在监护人指导下使用</li>
                                </ul>
                            </div>
                        </template>
                    </a-alert>
                </div>
            </div>
        </a-card>

        <!-- 版本更新 -->
        <a-card title="版本更新" class="setting-card">
            <div class="update-section">
                <!-- 自动检查更新设置 -->
                <a-form layout="vertical" style="margin-bottom: 16px;">
                    <a-form-item label="自动检查更新">
                        <a-switch v-model:checked="autoCheckUpdate" @change="onAutoCheckUpdateChange"
                            checked-children="启用" un-checked-children="禁用" />
                    </a-form-item>
                </a-form>

                <a-divider />

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
                        {{ formatDate(updateInfo.release.published_at) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="检查时间" v-if="lastCheckTime">
                        {{ lastCheckTime }}
                    </a-descriptions-item>
                </a-descriptions>

                <div style="margin-top: 16px;">
                    <a-space wrap>
                        <a-button v-if="updateInfo.hasUpdate" @click="openDownloadPage" type="default"
                            :icon="h(DownloadOutlined)">
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
import { ref, onMounted, h, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
    GithubOutlined,
    BugOutlined,
    DownloadOutlined,
    SyncOutlined
} from '@ant-design/icons-vue'
import { getVersion } from '@tauri-apps/api/app'
import { checkForUpdates } from '@/api/github'
import { useAppStore } from '@/stores/app'
import { openExternalUrl } from '@/utils/external-link'
import { formatDate } from '@/utils/date'

// github仓库地址
const repoUrl = 'https://github.com/caolib/doki'

// 关于页面信息
const appVersion = ref('')
const appStore = useAppStore()

// 自动检查更新设置
const autoCheckUpdate = ref(appStore.autoCheckUpdate)

// 版本更新相关 - 使用 store 中的数据
const updateInfo = computed(() => appStore.updateInfo || {
    hasUpdate: false,
    currentVersion: '',
    latestVersion: '',
    release: null
})
const checkingUpdate = ref(false)
const lastCheckTime = ref('')

// 监听组件挂载，如果有更新信息则清除红点
onMounted(() => {
    fetchAppVersion()
    if (appStore.hasUpdate) {
        // 用户进入关于页面，清除红点状态
        setTimeout(() => {
            appStore.clearUpdateInfo()
        })
    }
})

// 打开仓库地址
const openRepository = () => {
    openExternalUrl(repoUrl, '打开项目仓库失败')
}

// 打开反馈页面
const openFeedback = () => {
    openExternalUrl(`${repoUrl}/issues`, '打开反馈页面失败')
}

// 获取应用版本
const fetchAppVersion = () => {
    getVersion().then(version => {
        appVersion.value = version
    }).catch(error => {
        console.error('获取应用版本失败:', error)
        appVersion.value = '未知'
    })
}

// 检查更新
const checkUpdate = () => {
    checkingUpdate.value = true
    lastCheckTime.value = new Date().toLocaleString()

    checkForUpdates(appVersion.value).then(result => {
        // 更新 store 中的状态
        appStore.setUpdateInfo(result)

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

// 自动检查更新设置变化
const onAutoCheckUpdateChange = (checked) => {
    appStore.setAutoCheckUpdate(checked)
    message.success(checked ? '已启用启动时自动检查更新' : '已禁用启动时自动检查更新')
}

// 打开下载页面
const openDownloadPage = () => {
    openExternalUrl(`${repoUrl}/releases/latest`, '打开下载页面失败')
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
</script>

<style src="../../assets/styles/about-settings.scss" lang="scss" scoped></style>
