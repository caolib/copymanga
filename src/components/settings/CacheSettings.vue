<template>
    <div>
        <a-card title="缓存管理" class="setting-card">
            <div class="cache-management">
                <!-- 缓存信息 -->
                <a-descriptions :column="1" bordered style="margin-bottom: 24px;">
                    <a-descriptions-item label="WebView缓存"> <a-spin :spinning="loadingCacheSize" size="small">
                            <span v-if="cacheSize > 0">
                                {{ formatCacheSize(cacheSize) }}
                            </span>
                            <span v-else>
                                无缓存或缓存很小
                            </span>
                        </a-spin>
                    </a-descriptions-item>
                    <a-descriptions-item label="上次清理时间">
                        {{ lastClearTime || '上次' }}
                    </a-descriptions-item>
                </a-descriptions>

                <!-- 缓存操作 -->
                <div class="cache-actions">
                    <a-space wrap>
                        <a-button type="primary" @click="refreshCacheInfo" :loading="loadingCacheSize"
                            :icon="h(ReloadOutlined)">
                            刷新缓存信息
                        </a-button>
                        <a-button danger @click="showForceClearConfirm" :loading="clearingCache"
                            :disabled="cacheSize === 0" :icon="h(DeleteOutlined)">
                            清除缓存
                        </a-button>
                        <a-button @click="openCacheDirectory" :icon="h(FolderOpenOutlined)">
                            打开缓存目录
                        </a-button>
                    </a-space>
                </div>

                <!-- 缓存清理说明 -->
                <a-alert message="缓存清理说明" type="info" show-icon style="margin-top: 24px;">
                    <template #description>
                        <ul style="margin: 0; padding-left: 16px;">
                            <li>WebView缓存包含网页数据、图片、Cookie 等（不包括下载的漫画等），清除缓存会导致登录状态丢失</li>
                            <li>缓存默认在C盘，可以通过创建符号链接的方式转移到其他盘</li>
                            <li>清除缓存实际就是删除📂EBWebView，过程可能比较慢（因为被当前应用占用了），可以手动删除（需要先关闭应用）</li>
                        </ul>
                    </template>
                </a-alert>
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
    ReloadOutlined,
    DeleteOutlined,
    FolderOpenOutlined
} from '@ant-design/icons-vue'
import { invoke } from '@tauri-apps/api/core'

// 缓存状态
const cacheSize = ref(0)
const cacheDirectory = ref('')
const loadingCacheSize = ref(false)
const clearingCache = ref(false)
const lastClearTime = ref('')

// 组件挂载时加载缓存信息
onMounted(() => {
    loadCacheInfo()
    loadSettings()
})

// 加载缓存信息
const loadCacheInfo = () => {
    getCacheSize()
    getCacheDirectory()
}

// 获取缓存大小
const getCacheSize = () => {
    loadingCacheSize.value = true

    invoke('get_cache_size').then(size => {
        cacheSize.value = size
    }).catch(error => {
        console.error('获取缓存大小失败:', error)
        message.error('获取缓存大小失败')
    }).finally(() => {
        loadingCacheSize.value = false
    })
}

// 获取缓存目录路径
const getCacheDirectory = () => {
    invoke('get_webview_data_dir').then(dir => {
        cacheDirectory.value = dir
    }).catch(error => {
        console.error('获取缓存目录失败:', error)
        cacheDirectory.value = '获取失败'
    })
}

// 刷新缓存信息
const refreshCacheInfo = () => {
    loadCacheInfo()
}

// 格式化缓存大小
const formatCacheSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 显示强制清除确认对话框
const showForceClearConfirm = () => {
    Modal.confirm({
        title: '强制清除缓存',
        content: `确定要强制清除 ${formatCacheSize(cacheSize.value)} 的 WebView 缓存吗？此操作会结束相关进程并删除缓存文件。`,
        okText: '强制清除',
        cancelText: '取消',
        okType: 'danger',
        onOk: forceClearCache
    })
}

// 强制清除缓存
const forceClearCache = () => {
    clearingCache.value = true

    invoke('force_clear_webview_cache')
        .then(result => {
            message.success(result)

            // 更新清理时间
            lastClearTime.value = new Date().toLocaleString()
            saveSettings()

            // 刷新缓存信息
            getCacheSize()

        })
        .catch(error => {
            console.error('强制清除缓存失败:', error)
            message.error('强制清除缓存失败: ' + error)
        })
        .finally(() => {
            clearingCache.value = false
        })
}

// 打开缓存目录
const openCacheDirectory = () => {
    if (cacheDirectory.value) {
        invoke('open_file_explorer', { path: cacheDirectory.value }).then(() => {
            message.success('已打开缓存目录')
        }).catch(error => {
            console.error('打开缓存目录失败:', error)
            message.error('打开缓存目录失败')
        })
    }
}

// 加载设置
const loadSettings = () => {
    const settings = localStorage.getItem('cache-settings')
    if (settings) {
        const parsed = JSON.parse(settings)
        lastClearTime.value = parsed.lastClearTime || ''
    }
}

// 保存设置
const saveSettings = () => {
    const settings = {
        lastClearTime: lastClearTime.value
    }
    localStorage.setItem('cache-settings', JSON.stringify(settings))
}
</script>

<style scoped src="../../assets/styles/cache-settings.scss" lang="scss"></style>
