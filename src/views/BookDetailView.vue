<template>
    <div class="book-detail-container">
        <!-- 错误提示 -->
        <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />

        <!-- 加载骨架屏 -->
        <div v-if="loading" class="book-detail-skeleton">
            <div class="book-header-skeleton">
                <a-skeleton-image class="cover-skeleton" />
                <div class="info-skeleton">
                    <a-skeleton :paragraph="{ rows: 6 }" active />
                    <div class="actions-skeleton">
                        <a-skeleton-button size="large" active />
                        <a-skeleton-button size="large" active />
                    </div>
                </div>
            </div>
            <a-skeleton :paragraph="{ rows: 4 }" active title />
            <a-skeleton :paragraph="{ rows: 8 }" active title />
        </div>

        <!-- 轻小说详情 -->
        <div v-else-if="bookDetail" class="book-detail">
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
                            <span class="meta-value">{{ formatDatetimeUpdated(bookDetail.datetime_updated) }}</span>
                        </div>
                    </div>
                    <div class="book-actions">
                        <a-button type="primary" size="large" :loading="collectLoading" @click="handleCollect">
                            收藏
                        </a-button>
                        <a-button type="default" size="large" :loading="collectLoading" @click="handleUncollect">
                            取消收藏
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
            </div>

            <!-- 卷列表 -->
            <div class="book-volumes">
                <a-card title="卷列表" size="small">
                    <template #extra>
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

                    <!-- 卷列表骨架屏 -->
                    <div v-if="volumesLoading" class="volumes-skeleton">
                        <a-skeleton :paragraph="{ rows: 3 }" active />
                        <a-skeleton :paragraph="{ rows: 3 }" active />
                        <a-skeleton :paragraph="{ rows: 3 }" active />
                    </div>
                    <!-- 卷列表内容 -->
                    <div v-else>
                        <div v-if="volumes.length === 0" class="no-volumes">
                            <a-empty description="暂无卷" />
                        </div>
                        <div v-else class="volumes-grid">
                            <div v-for="volume in sortedVolumes" :key="volume.id" class="volume-item"
                                @click="readVolume(volume)">
                                <span class="volume-title">{{ volume.name }}</span>
                                <span class="volume-info">{{ volume.count }} 章</span>
                            </div>
                        </div>
                    </div>
                </a-card>
            </div>
        </div>
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
const sortOrder = ref('asc')

// 计算属性
const sortedVolumes = computed(() => {
    if (sortOrder.value === 'desc') {
        return [...volumes.value].reverse()
    }
    return volumes.value
})

// 获取轻小说详情
const fetchBookDetail = async () => {
    loading.value = true
    error.value = ''

    const pathWord = route.params.pathWord

    await getBookDetail(pathWord).then(response => {
        bookDetail.value = response.results.book
    }).catch(err => {
        console.error('获取轻小说详情失败:', err)
        error.value = err.message || '获取轻小说详情失败'
    }).finally(() => {
        loading.value = false
    })
}

// 获取卷列表
const fetchVolumes = async () => {
    volumesLoading.value = true

    const pathWord = route.params.pathWord

    await getBookVolumes(pathWord).then(response => {
        volumes.value = response.results.list
    }).catch(err => {
        console.error('获取卷列表失败:', err)
        message.error(err.message || '获取卷列表失败')
    }).finally(() => {
        volumesLoading.value = false
    })
}

// 收藏轻小说
const handleCollect = () => {
    collectLoading.value = true

    const bookUuid = bookDetail.value?.uuid
    if (!bookUuid) {
        message.error('无法获取书籍信息')
        collectLoading.value = false
        return
    }
    collectBook(bookUuid, true).then(response => {
        message.success('收藏成功')
    }).catch(err => {
        console.error('收藏失败:', err)
        message.error(err.message || '收藏失败')
    }).finally(() => {
        collectLoading.value = false
    })
}

// 取消收藏轻小说
const handleUncollect = () => {
    collectLoading.value = true

    const bookUuid = bookDetail.value?.uuid
    if (!bookUuid) {
        message.error('无法获取书籍信息')
        collectLoading.value = false
        return
    }
    collectBook(bookUuid, false).then(response => {
        message.success('取消收藏成功')
    }).catch(err => {
        console.error('取消收藏失败:', err)
        message.error(err.message || '取消收藏失败')
    }).finally(() => {
        collectLoading.value = false
    })
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

<style scoped src="../assets/styles/book-detail.scss" lang="scss"></style>
