<template>
    <div class="settings-view">
        <div class="settings-container">
            <h1>设置</h1>

            <a-card title="转发服务配置" class="setting-card">
                <a-form :model="serverForm" layout="vertical" @finish="onSubmitServer">
                    <a-form-item label="服务器端口（1-65535）" name="serverPort" :rules="[
                        { required: true, message: '请输入服务器端口' },
                        { validator: validatePort, trigger: 'blur' }
                    ]">
                        <a-input-number v-model:value="serverForm.serverPort" placeholder="5001" size="large" :min="1"
                            :max="65535" style="width: 100%" />
                    </a-form-item>

                    <a-form-item>
                        <a-space>
                            <a-button type="primary" html-type="submit" :loading="savingServer" size="large">
                                保存设置
                            </a-button>
                            <a-button @click="resetServerToDefault" size="large">
                                恢复默认
                            </a-button>
                        </a-space>
                    </a-form-item>
                </a-form>
            </a-card>

            <a-card title="API 域名配置" class="setting-card">
                <a-form :model="appForm" layout="vertical" @finish="onSubmitApp">
                    <a-form-item label="API 域名" name="apiDomain" :rules="[
                        { required: true, message: '请输入 API 域名' },
                        { validator: validateDomain, trigger: 'blur' }
                    ]">
                        <a-input v-model:value="appForm.apiDomain" placeholder="https://copy20.com" size="large" />
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

            <a-card title="当前状态" class="setting-card">
                <a-descriptions :column="1">
                    <a-descriptions-item label="转发服务器">
                        http://localhost:{{ currentServerPort }}
                    </a-descriptions-item>
                    <a-descriptions-item label="API 域名">
                        {{ currentApiDomain }}
                    </a-descriptions-item>
                    <a-descriptions-item label="配置文件">
                        应用配置目录/server.json, copymanga.json
                    </a-descriptions-item>
                </a-descriptions>
            </a-card>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
    getServerConfig,
    saveServerConfig,
    validateServerPort,
    getAppConfig,
    saveAppConfig,
    validateApiDomain
} from '@/utils/serverConfig'
import { useAppStore } from '@/stores/app'

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
const appStore = useAppStore()

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
        message.info('请重启应用以使新的服务器配置生效', 3)
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

onMounted(() => {
    loadConfig()
})
</script>

<style scoped>
.settings-view {
    padding: 24px;
    min-height: 100vh;
    background-color: #f5f5f5;
}

.settings-container {
    max-width: 800px;
    margin: 0 auto;
}

.setting-card {
    margin-bottom: 24px;
}

.help-text {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

h1 {
    margin-bottom: 24px;
    color: #333;
}
</style>
