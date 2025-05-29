<template>
    <div>
        <h2 class="settings-section-title">服务设置</h2>
        <a-card title="转发服务配置" class="setting-card" id="server-config">
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
        </a-card> <a-card title="API 域名配置" class="setting-card" id="api-config">
            <a-form layout="vertical">
                <!-- 当前API源选择 -->
                <a-form-item label="当前API源">
                    <a-select v-model:value="currentApiIndex" @change="onApiSourceChange" size="large"
                        style="width: 100%">
                        <a-select-option v-for="(source, index) in apiSources" :key="index" :value="index">
                            {{ source.name }} ({{ source.url }})
                        </a-select-option>
                    </a-select>
                    <div class="help-text">
                        选择要使用的API源
                    </div>
                </a-form-item>

                <!-- 添加新API源 -->
                <a-form-item label="添加新API源">
                    <a-input-group compact>
                        <a-input v-model:value="newApiSource.name" placeholder="源名称" style="width: 30%" size="large" />
                        <a-input v-model:value="newApiSource.url" placeholder="API域名 (如: https://copy20.com)"
                            style="width: 50%" size="large" />
                        <a-button type="primary" @click="addNewApiSource" :loading="addingSource" style="width: 20%"
                            size="large">
                            添加
                        </a-button>
                    </a-input-group>
                </a-form-item>

                <!-- API源管理 -->
                <a-form-item label="API源管理">
                    <a-list :data-source="apiSources" bordered size="small">
                        <template #renderItem="{ item, index }">
                            <a-list-item>
                                <template #actions>
                                    <a-button v-if="apiSources.length > 1" type="text" danger size="small"
                                        @click="removeApiSource(index)" :loading="removingIndex === index">
                                        删除
                                    </a-button>
                                </template>
                                <a-list-item-meta>
                                    <template #title>
                                        <span :class="{ 'current-source': index === currentApiIndex }">
                                            {{ item.name }}
                                            <a-tag v-if="index === currentApiIndex" color="green"
                                                size="small">当前</a-tag>
                                        </span>
                                    </template>
                                    <template #description>
                                        {{ item.url }}
                                    </template>
                                </a-list-item-meta>
                            </a-list-item>
                        </template>
                    </a-list>
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
                    <a-button type="primary" @click="handleRestart" :loading="restarting" size="large" danger>
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import {
    getServerConfig,
    saveServerConfig,
    validateServerPort,
    getAppConfig,
    saveAppConfig,
    validateApiDomain,
    addApiSource,
    removeApiSource as removeApiSourceConfig,
    switchApiSource
} from '@/utils/server-config'
import { useAppStore } from '@/stores/app'
import { relaunch } from '@tauri-apps/plugin-process'

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

// 新增：API源管理相关状态
const apiSources = ref([])
const currentApiIndex = ref(0)
const newApiSource = ref({
    name: '',
    url: ''
})
const addingSource = ref(false)
const removingIndex = ref(-1)

// 验证端口格式
const validatePort = (rule, value) => {
    if (!value) {
        return Promise.reject(new Error('请输入服务器端口'))
    }
    if (!validateServerPort(value)) {
        return Promise.reject(new Error('端口号必须是1-65535之间的数字'))
    }
    return Promise.resolve()
}

// 验证域名格式
const validateDomain = (rule, value) => {
    if (!value) {
        return Promise.reject(new Error('请输入 API 域名'))
    }
    if (!validateApiDomain(value)) {
        return Promise.reject(new Error('请输入有效的域名格式（如：https://example.com）'))
    }
    return Promise.resolve()
}

// 加载当前配置
const loadConfig = () => {
    // 加载服务器配置
    getServerConfig().then(config => {
        currentServerPort.value = config.serverPort
        serverForm.value.serverPort = parseInt(config.serverPort)
    }).catch(error => {
        message.error('加载服务器配置失败')
    })

    // 加载应用配置
    getAppConfig().then(config => {
        currentApiDomain.value = config.apiDomain
        appForm.value.apiDomain = config.apiDomain
        apiSources.value = config.apiSources || []
        currentApiIndex.value = config.currentApiIndex || 0
    }).catch(error => {
        message.error('加载应用配置失败')
    })
}

// 保存服务器配置
const onSubmitServer = () => {
    savingServer.value = true

    saveServerConfig(serverForm.value.serverPort.toString()).then(() => {
        message.success('服务器配置保存成功！')
        loadConfig()
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
        message.info('请重启应用以使新的 API 配置生效', 3)
        loadConfig()
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
    await relaunch().then(() => {
        appStore.setNeedsRestart(false)
    }).catch(error => {
        message.error('重启应用失败')
        restarting.value = false
    })
}

// 新增：API源切换
const onApiSourceChange = async (index) => {
    try {
        const source = await switchApiSource(index)
        currentApiDomain.value = source.url
        appForm.value.apiDomain = source.url
        appStore.setNeedsRestart(true)
        message.success(`已切换到: ${source.name}`)
    } catch (error) {
        message.error(error.message || '切换API源失败')
        // 切换失败时恢复原值
        loadConfig()
    }
}

// 新增：添加API源
const addNewApiSource = async () => {
    if (!newApiSource.value.name || !newApiSource.value.url) {
        message.error('请输入源名称和URL')
        return
    }

    addingSource.value = true
    try {
        await addApiSource(newApiSource.value.name, newApiSource.value.url)
        message.success('API源添加成功')
        newApiSource.value = { name: '', url: '' }
        loadConfig() // 重新加载配置
    } catch (error) {
        message.error(error.message || '添加API源失败')
    } finally {
        addingSource.value = false
    }
}

// 新增：删除API源
const removeApiSource = async (index) => {
    if (apiSources.value.length <= 1) {
        message.error('至少需要保留一个API源')
        return
    }

    removingIndex.value = index
    try {
        await removeApiSourceConfig(index)
        message.success('API源删除成功')
        loadConfig() // 重新加载配置
    } catch (error) {
        message.error(error.message || '删除API源失败')
    } finally {
        removingIndex.value = -1
    }
}

onMounted(() => {
    loadConfig()
})
</script>

<style src="../../assets/styles/server-settings.scss" lang="scss" scoped></style>
