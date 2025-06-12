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
            <a-form layout="vertical"> <!-- 当前API源选择 -->
                <a-form-item label="当前API源">
                    <a-select v-model:value="currentApiIndex" @change="onApiSourceChange" size="large"
                        style="width: 100%">
                        <a-select-option v-for="(source, index) in apiSources" :key="index" :value="index">
                            {{ source }}
                        </a-select-option>
                    </a-select>
                    <div class="help-text">
                        选择要使用的API源
                    </div>
                </a-form-item>

                <!-- 添加新API源 -->
                <a-form-item label="添加新API源">
                    <a-input-group compact>
                        <a-input v-model:value="newApiSource.url" placeholder="API域名 (如: https://copy20.com)"
                            style="width: 80%" size="large" />
                        <a-button type="primary" @click="addNewApiSource" :loading="addingSource" style="width: 20%"
                            size="large">
                            添加
                        </a-button>
                    </a-input-group>
                </a-form-item> <!-- API源管理 -->
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
                                            {{ item }}
                                            <a-tag v-if="index === currentApiIndex" color="green"
                                                size="small">当前</a-tag>
                                        </span>
                                    </template>
                                </a-list-item-meta>
                            </a-list-item>
                        </template>
                    </a-list>
                </a-form-item>
            </a-form> </a-card>

        <!-- 轻小说API源配置 -->
        <a-card title="轻小说API源配置" class="setting-card" id="book-api-config">
            <a-form layout="vertical">
                <!-- 当前轻小说API源选择 -->
                <a-form-item label="当前轻小说API源">
                    <a-select v-model:value="currentBookApiIndex" @change="onBookApiSourceChange" size="large"
                        style="width: 100%">
                        <a-select-option v-for="(source, index) in bookApiSources" :key="index" :value="index">
                            {{ source }}
                        </a-select-option>
                    </a-select>
                    <div class="help-text">
                        选择要使用的轻小说API源
                    </div>
                </a-form-item>

                <!-- 添加新轻小说API源 -->
                <a-form-item label="添加新轻小说API源">
                    <a-input-group compact>
                        <a-input v-model:value="newBookApiSource.url"
                            placeholder="轻小说API域名 (如: https://api.copy-manga.com)" style="width: 80%" size="large" />
                        <a-button type="primary" @click="addNewBookApiSource" :loading="addingBookSource"
                            style="width: 20%" size="large">
                            添加
                        </a-button>
                    </a-input-group>
                </a-form-item>

                <!-- 轻小说API源管理 -->
                <a-form-item label="轻小说API源管理">
                    <a-list :data-source="bookApiSources" bordered size="small">
                        <template #renderItem="{ item, index }">
                            <a-list-item>
                                <template #actions>
                                    <a-button v-if="bookApiSources.length > 1" type="text" danger size="small"
                                        @click="removeBookApiSource(index)" :loading="removingBookIndex === index">
                                        删除
                                    </a-button>
                                </template>
                                <a-list-item-meta>
                                    <template #title>
                                        <span :class="{ 'current-source': index === currentBookApiIndex }">
                                            {{ item }}
                                            <a-tag v-if="index === currentBookApiIndex" color="orange"
                                                size="small">当前</a-tag>
                                        </span>
                                    </template>
                                </a-list-item-meta>
                            </a-list-item>
                        </template>
                    </a-list>
                </a-form-item>
            </a-form>
        </a-card>

        <!-- 请求头配置 -->
        <a-card title="请求头配置" class="setting-card" id="headers-config">
            <a-form layout="vertical">
                <a-alert type="info" show-icon style="margin-bottom: 16px">
                    <template #message>
                        配置API请求时的自定义请求头，用于模拟移动端APP访问。dt字段会自动生成当前日期。
                    </template>
                </a-alert>

                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="来源标识 (source)">
                            <a-input v-model:value="headersForm.source" placeholder="copyApp" size="large" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="平台标识 (platform)">
                            <a-input v-model:value="headersForm.platform" placeholder="3" size="large" />
                        </a-form-item>
                    </a-col>
                </a-row>

                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="应用版本 (version)">
                            <a-input v-model:value="headersForm.version" placeholder="2.3.0" size="large" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="地区标识 (region)">
                            <a-input v-model:value="headersForm.region" placeholder="1" size="large" />
                        </a-form-item>
                    </a-col>
                </a-row>

                <a-form-item label="设备信息 (deviceinfo)">
                    <a-input v-model:value="headersForm.deviceinfo" placeholder="PGEM10-star2qltechn" size="large" />
                </a-form-item>

                <a-form-item label="设备标识 (device)">
                    <a-input v-model:value="headersForm.device" placeholder="PQ3B.190801.05281406" size="large" />
                </a-form-item>

                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="WebP支持 (webp)">
                            <a-input v-model:value="headersForm.webp" placeholder="1" size="large" />
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="统计字符串 (umstring)">
                            <a-input v-model:value="headersForm.umstring" placeholder="b4c89ca4104ea9a97750314d791520ac"
                                size="large" />
                        </a-form-item>
                    </a-col>
                </a-row>

                <a-form-item>
                    <a-space>
                        <a-button type="primary" @click="saveHeaders" :loading="savingHeaders" size="large">
                            保存请求头配置
                        </a-button>
                        <a-button @click="resetHeaders" size="large">
                            恢复默认值
                        </a-button>
                    </a-space>
                </a-form-item>
            </a-form>
        </a-card>

        <a-card title="当前状态" class="setting-card" id="status"> <a-descriptions :column="1">
                <a-descriptions-item label="转发服务器">
                    http://localhost:{{ currentServerPort }}
                </a-descriptions-item>
                <a-descriptions-item label="漫画API域名">
                    {{ currentApiDomain }}
                </a-descriptions-item>
                <a-descriptions-item label="轻小说API域名">
                    {{ currentBookApiDomain }}
                </a-descriptions-item>
            </a-descriptions>

            <a-divider />

            <div class="restart-section">
                <a-alert v-if="appStore.needsRestart" type="warning" message="配置已更改，需要重启应用以生效" show-icon
                    style="margin-bottom: 16px" />
                <a-space>
                    <a-button type="primary" @click="handleRestart" :loading="restarting" size="large" danger
                        :icon="h(ReloadOutlined)">
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
import { h } from 'vue'
import {
    getServerConfig,
    saveServerConfig,
    validateServerPort,
    getAppConfig,
    saveAppConfig,
    validateApiDomain,
    addApiSource,
    removeApiSource as removeApiSourceConfig,
    switchApiSource,
    addBookApiSource,
    removeBookApiSource as removeBookApiSourceConfig,
    switchBookApiSource,
    getRequestHeaders,
    saveRequestHeaders,
    resetRequestHeaders,
    getDefaultRequestHeaders
} from '@/config/server-config'
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
    url: ''
})
const addingSource = ref(false)
const removingIndex = ref(-1)

// 新增：轻小说API源管理相关状态
const bookApiSources = ref([])
const currentBookApiIndex = ref(0)
const currentBookApiDomain = ref('未配置')
const newBookApiSource = ref({
    url: ''
})
const addingBookSource = ref(false)
const removingBookIndex = ref(-1)

// 请求头配置相关状态
const headersForm = ref({
    source: 'copyApp',
    deviceinfo: 'PGEM10-star2qltechn',
    webp: '1',
    platform: '3',
    version: '2.3.0',
    region: '1',
    device: 'PQ3B.190801.05281406',
    umstring: 'b4c89ca4104ea9a97750314d791520ac'
})
const savingHeaders = ref(false)

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
        // 加载漫画API源
        apiSources.value = config.apiSources || []

        // 如果有API源，确保索引有效
        if (apiSources.value.length > 0) {
            // 如果索引无效，重置为0
            if (config.currentApiIndex < 0 || config.currentApiIndex >= apiSources.value.length) {
                currentApiIndex.value = 0
                // 同时保存更新后的配置
                saveAppConfig({
                    apiSources: apiSources.value,
                    currentApiIndex: 0,
                    bookApiSources: config.bookApiSources || [],
                    currentBookApiIndex: config.currentBookApiIndex || 0
                }).catch(error => {
                    console.warn('保存修正后的配置失败:', error)
                })
            } else {
                currentApiIndex.value = config.currentApiIndex
            }

            // 设置当前域名
            const currentSource = apiSources.value[currentApiIndex.value]
            currentApiDomain.value = currentSource
            appForm.value.apiDomain = currentSource
        } else {
            // 没有API源时，重置索引
            currentApiIndex.value = -1
            currentApiDomain.value = '未配置'
            appForm.value.apiDomain = ''
        }

        // 加载轻小说API源
        bookApiSources.value = config.bookApiSources || []

        // 如果有轻小说API源，确保索引有效
        if (bookApiSources.value.length > 0) {
            // 如果索引无效，重置为0
            if (config.currentBookApiIndex < 0 || config.currentBookApiIndex >= bookApiSources.value.length) {
                currentBookApiIndex.value = 0
                // 同时保存更新后的配置
                saveAppConfig({
                    apiSources: config.apiSources || [],
                    currentApiIndex: config.currentApiIndex || 0,
                    bookApiSources: bookApiSources.value,
                    currentBookApiIndex: 0
                }).catch(error => {
                    console.warn('保存修正后的轻小说配置失败:', error)
                })
            } else {
                currentBookApiIndex.value = config.currentBookApiIndex
            }

            // 设置当前轻小说域名
            const currentBookSource = bookApiSources.value[currentBookApiIndex.value]
            currentBookApiDomain.value = currentBookSource
        } else {
            // 没有轻小说API源时，重置索引
            currentBookApiIndex.value = -1
            currentBookApiDomain.value = '未配置'
        }
    }).catch(error => {
        message.error('加载应用配置失败')
    })

    // 加载请求头配置
    getRequestHeaders().then(headers => {
        headersForm.value = { ...headers }
    }).catch(error => {
        console.warn('加载请求头配置失败:', error)
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

// 重置为默认值
const resetServerToDefault = () => {
    serverForm.value.serverPort = 5001
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
        currentApiDomain.value = source
        appForm.value.apiDomain = source
        appStore.setNeedsRestart(true)
        message.success(`已切换到: ${source}`)
    } catch (error) {
        message.error(error.message || '切换API源失败')
        // 切换失败时恢复原值
        loadConfig()
    }
}

// 新增：添加API源
const addNewApiSource = async () => {
    if (!newApiSource.value.url) {
        message.error('请输入URL')
        return
    }

    addingSource.value = true
    try {
        await addApiSource(newApiSource.value.url)
        message.success('API源添加成功')
        newApiSource.value = { url: '' }
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

// 新增：轻小说API源切换
const onBookApiSourceChange = async (index) => {
    try {
        const source = await switchBookApiSource(index)
        currentBookApiDomain.value = source
        appStore.setNeedsRestart(true)
        message.success(`已切换轻小说API源到: ${source}`)
    } catch (error) {
        message.error(error.message || '切换轻小说API源失败')
        // 切换失败时恢复原值
        loadConfig()
    }
}

// 新增：添加轻小说API源
const addNewBookApiSource = async () => {
    if (!newBookApiSource.value.url) {
        message.error('请输入轻小说API URL')
        return
    }

    addingBookSource.value = true
    try {
        await addBookApiSource(newBookApiSource.value.url)
        message.success('轻小说API源添加成功')
        newBookApiSource.value = { url: '' }
        loadConfig() // 重新加载配置
    } catch (error) {
        message.error(error.message || '添加轻小说API源失败')
    } finally {
        addingBookSource.value = false
    }
}

// 新增：删除轻小说API源
const removeBookApiSource = async (index) => {
    if (bookApiSources.value.length <= 1) {
        message.error('至少需要保留一个轻小说API源')
        return
    }

    removingBookIndex.value = index
    try {
        await removeBookApiSourceConfig(index)
        message.success('轻小说API源删除成功')
        loadConfig() // 重新加载配置
    } catch (error) {
        message.error(error.message || '删除轻小说API源失败')
    } finally {
        removingBookIndex.value = -1
    }
}

// 保存请求头配置
const saveHeaders = async () => {
    savingHeaders.value = true
    try {
        await saveRequestHeaders(headersForm.value)
        message.success('请求头配置保存成功！')
        appStore.setNeedsRestart(true)
    } catch (error) {
        message.error(error.message || '保存请求头配置失败')
    } finally {
        savingHeaders.value = false
    }
}

// 重置请求头为默认值
const resetHeaders = async () => {
    try {
        const defaultHeaders = getDefaultRequestHeaders()
        headersForm.value = { ...defaultHeaders }
        await saveRequestHeaders(defaultHeaders)
        message.success('已恢复默认请求头配置')
        appStore.setNeedsRestart(true)
    } catch (error) {
        message.error('重置请求头配置失败')
    }
}

onMounted(() => {
    loadConfig()
})
</script>

<style src="../../assets/styles/server-settings.scss" lang="scss" scoped></style>
