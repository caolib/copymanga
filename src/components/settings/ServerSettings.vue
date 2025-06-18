<template>
    <div>
        <a-card title="转发服务配置" class="setting-card" id="server-config">
            <a-form :model="serverForm" layout="vertical" @finish="onSubmitServer">
                <a-form-item label="服务器端口（1-65535）" name="serverPort">
                    <a-input-group compact>
                        <a-input-number v-model:value="serverForm.serverPort" placeholder="输入一个端口号" :min="1"
                            :max="65535" style="width: fit-content" />
                        <a-button type="primary" html-type="submit" :loading="savingServer" style="width: fit-content">
                            保存
                        </a-button>
                    </a-input-group>
                </a-form-item>

                <!-- Rust服务器状态监控 -->
                <a-form-item>
                    <a-space>
                        <a-badge :status="serverStatus.status" :text="serverStatus.text" />
                        <span class="status-info">{{ serverStatus.info }}</span>
                    </a-space>
                </a-form-item>
            </a-form>
        </a-card> <a-card title="API 域名配置" class="setting-card" id="api-config">
            <a-form layout="vertical"> <!-- 当前API源选择 -->
                <a-form-item label="当前API源">
                    <a-select v-model:value="currentApiIndex" @change="onApiSourceChange" style="width: fit-content">
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
                        <a-input v-model:value="newApiSource.url" placeholder="API域名" style="width: fit-content" />
                        <a-button type="primary" @click="addNewApiSource" :loading="addingSource"
                            style="width: fit-content">
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
                                        :icon="h(DeleteOutlined)" @click="removeApiSource(index)"
                                        :loading="removingIndex === index">
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
                    <a-select v-model:value="currentBookApiIndex" @change="onBookApiSourceChange"
                        style="width:fit-content">
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
                            placeholder="轻小说API域名 (如: https://api.copy-manga.com)" style="width: fit-content" />
                        <a-button type="primary" @click="addNewBookApiSource" :loading="addingBookSource"
                            style="width: fit-content">
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
                                        :icon="h(DeleteOutlined)" @click="removeBookApiSource(index)"
                                        :loading="removingBookIndex === index"></a-button>
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
                <a-alert type="info" show-icon style="width:fit-content;margin-bottom:10px">
                    <template #message>
                        配置API请求时的自定义请求头
                    </template>
                </a-alert>

                <!-- 添加新请求头 -->
                <a-form-item label="添加新请求头">
                    <a-row :gutter="16">
                        <a-col :span="8">
                            <a-input v-model:value="newHeader.key" placeholder="请求头名称" @keyup.enter="addNewHeader" />
                        </a-col>
                        <a-col :span="14">
                            <a-input v-model:value="newHeader.value" placeholder="请求头值" @keyup.enter="addNewHeader" />
                        </a-col>
                        <a-col :span="2">
                            <a-button type="primary" @click="addNewHeader" :icon="h(PlusOutlined)"
                                :disabled="!newHeader.key || !newHeader.value" block>
                            </a-button>
                        </a-col>
                    </a-row>
                </a-form-item>

                <!-- 现有请求头列表 -->
                <a-form-item>
                    <div v-if="headersList.length === 0" class="empty-headers">
                        <a-empty description="暂无请求头配置" :image="false" />
                    </div>
                    <div v-else class="headers-list">
                        <div v-for="(header, index) in headersList" :key="index" class="header-item">
                            <a-row :gutter="16" align="middle">
                                <a-col :span="8">
                                    <a-input v-model:value="header.key" placeholder="请求头名称"
                                        @change="onHeaderChange(index)" />
                                </a-col>
                                <a-col :span="14">
                                    <a-input v-model:value="header.value" placeholder="请求头值"
                                        @change="onHeaderChange(index)" />
                                </a-col>
                                <a-col :span="2">
                                    <a-button type="text" danger @click="removeHeader(index)" :icon="h(DeleteOutlined)"
                                        block>
                                    </a-button>
                                </a-col>
                            </a-row>
                        </div>
                    </div>
                </a-form-item>

                <a-form-item>
                    <a-space>
                        <a-button type="primary" @click="saveAllHeaders" :loading="savingHeaders">
                            保存配置
                        </a-button>

                        <a-button @click="exportHeaders" :loading="exportingHeaders" :icon="h(DownloadOutlined)">
                            导出配置
                        </a-button>

                        <a-button @click="importHeaders" :loading="importingHeaders" :icon="h(UploadOutlined)">
                            导入配置
                        </a-button>

                        <a-popconfirm title="你确定?" ok-text="对的" cancel-text="不对" @confirm="resetHeaders">
                            <a-button>恢复默认</a-button>
                        </a-popconfirm>

                    </a-space>
                </a-form-item>
            </a-form>
        </a-card>

        <a-card title="当前状态" class="setting-card" id="status">
            <div class="restart-section">
                <a-alert v-if="appStore.needsRestart" type="warning" message="配置已更改，需要重启应用以生效" show-icon
                    style="margin-bottom: 16px" />
                <a-space>
                    <a-button type="primary" @click="handleRestart" :loading="restarting" danger
                        :icon="h(ReloadOutlined)">
                        重启应用
                    </a-button>
                    <a-button @click="openConfigDirectory" :icon="h(SettingOutlined)" :loading="openingDirectory">
                        打开配置目录
                    </a-button>
                    <span class="restart-help">重启应用以应用所有配置更改</span>
                </a-space>
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
    getDefaultRequestHeaders
} from '@/config/server-config'
import { useAppStore } from '@/stores/app'
import { invoke } from '@tauri-apps/api/core'
import { dirname } from '@tauri-apps/api/path'
import { appDataDir } from '@tauri-apps/api/path'
import { restartApp } from '@/utils/restart-helper'
import { exportHeaders as exportHeadersConfig, importHeaders as importHeadersConfig } from '@/utils/export-helper'
import { PlusOutlined, DeleteOutlined, SettingOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons-vue'

const serverForm = ref({
    serverPort: 5001
})

const appForm = ref({ apiDomain: '' })

const currentServerPort = ref('')
const currentApiDomain = ref('')
const savingServer = ref(false)
const restarting = ref(false)
const openingDirectory = ref(false)
const appStore = useAppStore()

// 新增：API源管理相关状态
const apiSources = ref([])
const currentApiIndex = ref(0)
const newApiSource = ref({ url: '' })
const addingSource = ref(false)
const removingIndex = ref(-1)

// 新增：轻小说API源管理相关状态
const bookApiSources = ref([])
const currentBookApiIndex = ref(0)
const currentBookApiDomain = ref('未配置')
const newBookApiSource = ref({ url: '' })
const addingBookSource = ref(false)
const removingBookIndex = ref(-1)

// 请求头配置相关状态
const headersList = ref([])
const newHeader = ref({ key: '', value: '' })
const savingHeaders = ref(false)
const exportingHeaders = ref(false)
const importingHeaders = ref(false)

// Rust服务器状态监控
const serverStatus = ref({
    status: 'default',
    text: '检查中...',
    color: 'default',
    displayText: '检查中',
    info: '正在检查服务器状态...'
})
let statusCheckInterval = null

// 加载当前配置
const loadConfig = () => {
    // 加载服务器配置
    getServerConfig().then(config => {
        currentServerPort.value = config.serverPort
        serverForm.value.serverPort = parseInt(config.serverPort)
    }).catch(error => {
        message.error('加载服务器配置失败', error)
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
        // 将对象转换为键值对数组
        headersList.value = Object.entries(headers || {}).map(([key, value]) => ({
            key,
            value
        }))
    }).catch(error => {
        console.warn('加载请求头配置失败:', error)
        headersList.value = []
    })
}

// 保存服务器配置
const onSubmitServer = () => {
    savingServer.value = true

    saveServerConfig(serverForm.value.serverPort).then(() => {
        message.success('服务器配置保存成功！')
        appStore.setNeedsRestart(true)
        loadConfig()
    }).catch(error => {
        message.error(error.message || '保存服务器配置失败')
    }).finally(() => {
        savingServer.value = false
    })
}

// 处理重启应用
const handleRestart = async () => {
    restarting.value = true

    try {
        await restartApp()
        appStore.setNeedsRestart(false)
    } catch (error) {
        console.error('重启应用失败:', error)
        message.error('重启应用失败')
        restarting.value = false
    }
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

// 添加新请求头
const addNewHeader = () => {
    if (!newHeader.value.key || !newHeader.value.value) {
        message.error('请输入完整的请求头名称和值')
        return
    }

    // 检查是否已存在相同的键
    const existingIndex = headersList.value.findIndex(header => header.key === newHeader.value.key)
    if (existingIndex !== -1) {
        message.error('该请求头已存在，请使用不同的名称')
        return
    }

    headersList.value.push({
        key: newHeader.value.key,
        value: newHeader.value.value
    })

    // 清空输入框
    newHeader.value = { key: '', value: '' }
    message.success('请求头已添加')
}

// 删除请求头
const removeHeader = (index) => {
    headersList.value.splice(index, 1)
    message.success('请求头已删除')
}

// 请求头值变化时的处理
const onHeaderChange = (index) => {
    // 这里可以添加实时验证逻辑
    const header = headersList.value[index]
    if (!header.key || !header.value) {
        console.warn(`请求头 ${index} 的键或值为空`)
    }
}

// 保存所有请求头配置
const saveAllHeaders = async () => {
    savingHeaders.value = true

    try {
        // 验证所有请求头
        const invalidHeaders = headersList.value.filter(header => !header.key || !header.value)
        if (invalidHeaders.length > 0) {
            message.error('存在空的请求头键或值，请检查配置')
            savingHeaders.value = false
            return
        }

        // 检查重复的键
        const keys = headersList.value.map(header => header.key)
        const uniqueKeys = new Set(keys)
        if (keys.length !== uniqueKeys.size) {
            message.error('存在重复的请求头键，请检查配置')
            savingHeaders.value = false
            return
        }

        // 转换为对象格式保存
        const headersObject = {}
        headersList.value.forEach(header => {
            headersObject[header.key] = header.value
        })

        await saveRequestHeaders(headersObject)
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
        headersList.value = Object.entries(defaultHeaders).map(([key, value]) => ({
            key,
            value
        }))
        await saveRequestHeaders(defaultHeaders)
        message.success('已恢复默认请求头配置')
        appStore.setNeedsRestart(true)
    } catch (error) {
        message.error('重置请求头配置失败')
    }
}

// 导出请求头配置
const exportHeaders = async () => {
    try {
        exportingHeaders.value = true
        await exportHeadersConfig(headersList.value)
    } catch (error) {
        console.error('导出请求头配置失败:', error)
    } finally {
        exportingHeaders.value = false
    }
}

// 导入请求头配置
const importHeaders = async () => {
    try {
        importingHeaders.value = true

        const importedData = await importHeadersConfig()
        if (importedData) {
            // 将导入的对象转换为 headersList 格式
            headersList.value = Object.entries(importedData).map(([key, value]) => ({
                key,
                value
            }))

            // 自动保存导入的配置
            try {
                await saveRequestHeaders(importedData)
                message.success('请求头配置已导入并保存')
                appStore.setNeedsRestart(true)
            } catch (saveError) {
                message.error('导入成功但保存失败，请手动保存配置')
                console.error('保存导入的配置失败:', saveError)
            }
        }
    } catch (error) {
        console.error('导入请求头配置失败:', error)
    } finally {
        importingHeaders.value = false
    }
}

// 打开配置目录
const openConfigDirectory = async () => {
    openingDirectory.value = true

    await appDataDir().then(appDataPath => {
        const configDir = appDataPath + '\\config'
        // console.log('配置目录:', configDir)
        return invoke('open_file_explorer', { path: configDir })
    }).catch(error => {
        message.error('打开配置目录失败: ' + (error.message || error))
        console.error('打开配置目录失败:', error)
    }).finally(() => {
        openingDirectory.value = false
    })
}

// 检查Rust服务器状态
const checkServerStatus = async () => {
    const config = await getServerConfig()
    const port = config.serverPort
    // 尝试启动代理服务器，如果已经在运行会返回相应消息
    const result = await invoke('start_proxy_server')
    if (result === "代理服务器已经在运行") {
        serverStatus.value = {
            status: 'success',
            text: '运行中',
            info: `代理服务器正在端口 ${port} 上运行`
        }
    } else {
        serverStatus.value = {
            status: 'error',
            text: '已停止',
            info: '代理服务器未运行'
        }
    }
}

// 启动状态检查定时器 5秒检查一次
const startStatusCheck = () => {
    checkServerStatus()
    statusCheckInterval = setInterval(checkServerStatus, 5000)
}

// 停止状态检查定时器
const stopStatusCheck = () => {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
    }
}

onMounted(() => {
    loadConfig()
    startStatusCheck()
})

onUnmounted(() => {
    stopStatusCheck()
})
</script>

<style src="../../assets/styles/server-settings.scss" lang="scss" scoped></style>
