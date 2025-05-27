<template>
    <div class="settings-view">
        <div class="settings-container">
            <h1>设置</h1>

            <a-card title="服务器配置" class="setting-card">
                <a-form :model="form" layout="vertical" @finish="onSubmit">
                    <a-form-item label="服务器地址" name="serverUrl" :rules="[
                        { required: true, message: '请输入服务器地址' },
                        { validator: validateUrl, trigger: 'blur' }
                    ]">
                        <a-input v-model:value="form.serverUrl" placeholder="http://localhost:5001" size="large" />
                        <div class="help-text">
                            默认: http://localhost:5001
                        </div>
                    </a-form-item>

                    <a-form-item>
                        <a-space>
                            <a-button type="primary" html-type="submit" :loading="saving" size="large">
                                保存设置
                            </a-button>
                            <a-button @click="resetToDefault" size="large">
                                恢复默认
                            </a-button>
                        </a-space>
                    </a-form-item>
                </a-form>
            </a-card>

            <a-card title="当前状态" class="setting-card">
                <a-descriptions :column="1">
                    <a-descriptions-item label="当前服务器">
                        {{ currentServerUrl }}
                    </a-descriptions-item>
                    <a-descriptions-item label="配置文件">
                        应用配置目录/server.json
                    </a-descriptions-item>
                </a-descriptions>
            </a-card>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getServerConfig, saveServerConfig, validateServerUrl } from '@/utils/serverConfig'
import { useAppStore } from '@/stores/app'

const form = ref({
    serverUrl: ''
})

const currentServerUrl = ref('')
const saving = ref(false)
const appStore = useAppStore()

// 验证 URL 格式
const validateUrl = (rule, value) => {
    if (!value) {
        return Promise.reject('请输入服务器地址')
    }
    if (!validateServerUrl(value)) {
        return Promise.reject('请输入有效的 URL 地址 (如: http://localhost:5001)')
    }
    return Promise.resolve()
}

// 加载当前配置
const loadConfig = () => {
    getServerConfig().then(config => {
        form.value.serverUrl = config.serverUrl
        currentServerUrl.value = config.serverUrl
    }).catch(error => {
        console.error('加载配置失败:', error)
        message.error('加载配置失败')
    })
}

// 保存配置
const onSubmit = () => {
    saving.value = true

    saveServerConfig(form.value.serverUrl).then(() => {
        currentServerUrl.value = form.value.serverUrl
        appStore.setNeedsRestart(true)
        message.success('设置保存成功！')

        // 提示用户重启应用以使配置生效
        message.info('请重启应用以使新的服务器配置生效', 3)
    }).catch(error => {
        message.error(error.message || '保存设置失败')
    }).finally(() => {
        saving.value = false
    })
}

// 重置为默认值
const resetToDefault = () => {
    form.value.serverUrl = 'http://localhost:5001'
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
