<template>
    <div class="book-detail-container">
        <a-spin :spinning="loading" tip="加载中...">
            <!-- 错误提示 -->
            <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />

            <!-- 轻小说详情 -->
            <div v-if="bookDetail" class="book-detail">
                <!-- 顶部信息区 -->
                <div class="book-header">
                    <div class="book-cover-container">
                        <img :src="bookDetail.cover" :alt="bookDetail.name" class="book-cover" />
                    </div>
                    <div class="book-info">
                        <h1 class="book-title">{{ bookDetail.name }}</h1>
                        <div class="book-meta">
                            <div class="meta-item" v-if="bookDetail.author && bookDetail.author.length > 0">
                                <span class="meta-label">作者：</span>
                                <span class="meta-value">{{bookDetail.author.map(a => a.name).join('、')}}</span>
                            </div>
                            <div class="meta-item" v-if="bookDetail.theme && bookDetail.theme.length > 0">
                                <span class="meta-label">题材：</span>
                                <span class="meta-value">
                                    <a-tag v-for="theme in bookDetail.theme" :key="theme.name" color="blue">
                                        {{ theme.name }}
                                    </a-tag>
                                </span>
                            </div>
                            <div class="meta-item" v-if="bookDetail.status">
                                <span class="meta-label">状态：</span>
                                <a-tag :color="bookDetail.status.value === 1 ? 'green' : 'orange'">
                                    {{ bookDetail.status.display }}
                                </a-tag>
                            </div>
                            <div class="meta-item" v-if="bookDetail.datetime_updated">
                                <span class="meta-label">更新时间：</span>
                                <span class="meta-value">{{ formatDate(bookDetail.datetime_updated) }}</span>
                            </div>
                        </div>
                        <div class="book-actions">
                            <a-button type="primary" size="large" :loading="collectLoading" @click="toggleCollect">
                                {{ isCollected ? '取消收藏' : '加入书架' }}
                            </a-button>
                            <a-button v-if="volumes.length > 0" size="large" @click="startReading">
                                开始阅读
                            </a-button>
                        </div>
                    </div>
                </div>

                <!-- 简介 -->
                <div v-if="bookDetail.brief" class="book-description">
                    <a-card title="简介" size="small">
                        <div class="description-content" v-html="bookDetail.brief"></div>
                    </a-card>
                </div> <!-- 卷列表 -->
                <div class="book-volumes">
                    <a-card title="卷列表" size="small"> <template #extra>
                            <a-space>
                                <a-button type="text" size="small" @click="refreshVolumes" :loading="volumesLoading">
                                    <template #icon>
                                        <ReloadOutlined />
                                    </template>
                                    刷新
                                </a-button>
                                <a-select v-model:value="sortOrder" style="width: 120px" @change="sortVolumes">
                                    <a-select-option value="asc">正序</a-select-option>
                                    <a-select-option value="desc">倒序</a-select-option>
                                </a-select>
                                <span class="volume-count">共 {{ volumes.length }} 卷</span>
                            </a-space>
                        </template>

                        <a-spin :spinning="volumesLoading" tip="加载卷列表中...">
                            <div v-if="volumes.length === 0 && !volumesLoading" class="no-volumes">
                                <a-empty description="暂无卷" />
                            </div>
                            <div v-else class="volumes-grid">
                                <div v-for="volume in sortedVolumes" :key="volume.id" class="volume-item"
                                    @click="readVolume(volume)">
                                    <span class="volume-title">{{ volume.name }}</span>
                                    <span class="volume-info">{{ volume.count }} 章</span>
                                </div>
                            </div>
                        </a-spin>
                    </a-card>
                </div>
            </div>
        </a-spin>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { getBookDetail, getBookVolumes, collectBook } from '@/api/book'
import { formatDatetimeUpdated } from '@/utils/date'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(true)
const volumesLoading = ref(false)
const collectLoading = ref(false)
const error = ref('')
const bookDetail = ref(null)
const volumes = ref([])
const isCollected = ref(false)
const sortOrder = ref('asc')

// 计算属性
const sortedVolumes = computed(() => {
    if (sortOrder.value === 'desc') {
        return [...volumes.value].reverse()
    }
    return volumes.value
})

// 格式化日期
const formatDate = (dateString) => {
    if (!dateString) return '未知'
    try {
        return formatDatetimeUpdated(dateString)
    } catch (error) {
        return '未知时间'
    }
}

// 获取轻小说详情
const fetchBookDetail = async () => {
    try {
        loading.value = true
        error.value = ''

        const pathWord = route.params.pathWord
        if (!pathWord) {
            throw new Error('缺少轻小说标识')
        }

        const response = await getBookDetail(pathWord)
        if (response && response.results) {
            bookDetail.value = response.results.book
            // 检查是否已收藏（这里可能需要根据实际API调整）
            isCollected.value = response.results.is_collected || false
        } else {
            throw new Error('获取轻小说详情失败')
        }
    } catch (err) {
        console.error('获取轻小说详情失败:', err)
        error.value = err.message || '获取轻小说详情失败'
    } finally {
        loading.value = false
    }
}

// 获取卷列表
const fetchVolumes = async () => {
    try {
        volumesLoading.value = true

        const pathWord = route.params.pathWord
        if (!pathWord) {
            return
        }

        const response = await getBookVolumes(pathWord)
        if (response && response.results && response.results.list) {
            volumes.value = response.results.list
        }
    } catch (err) {
        console.error('获取卷列表失败:', err)
        message.error('获取卷列表失败')
    } finally {
        volumesLoading.value = false
    }
}

// 切换收藏状态
const toggleCollect = async () => {
    try {
        collectLoading.value = true

        const pathWord = route.params.pathWord
        const response = await collectBook(pathWord, !isCollected.value)

        if (response && response.code === 200) {
            isCollected.value = !isCollected.value
            message.success(isCollected.value ? '收藏成功' : '取消收藏成功')
        } else {
            throw new Error('操作失败')
        }
    } catch (err) {
        console.error('收藏操作失败:', err)
        message.error(err.message || '收藏操作失败')
    } finally {
        collectLoading.value = false
    }
}

// 开始阅读（跳转到第一卷）
const startReading = () => {
    if (volumes.value.length > 0) {
        const firstVolume = volumes.value[0]
        readVolume(firstVolume)
    }
}

// 阅读卷（跳转到该卷的章节列表页面）
const readVolume = (volume) => {
    const pathWord = route.params.pathWord
    // 这里可以跳转到卷的章节列表页面，或者直接跳转到第一章
    router.push(`/book/${pathWord}/volume/${volume.id}`)
}

// 刷新卷列表
const refreshVolumes = async () => {
    await fetchVolumes()
    message.success('卷列表已刷新')
}

// 排序卷
const sortVolumes = () => {
    // 排序逻辑已在计算属性中处理
}

// 组件挂载时获取数据
onMounted(async () => {
    await fetchBookDetail()
    await fetchVolumes()
})
</script>

<style scoped src="../assets/styles/book-detail-view.scss" lang="scss"></style>
