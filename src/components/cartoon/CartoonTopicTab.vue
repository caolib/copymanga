<template>
    <div class="cartoon-topic-tab">
        <!-- 筛选和刷新区域 -->
        <div class="filter-section">
            <a-row :gutter="16" align="middle">
                <a-col :span="24" style="text-align: right;">
                    <a-button @click="refreshTopics" :loading="loading" type="primary">
                        刷新
                    </a-button>
                </a-col>
            </a-row>
        </div>

        <!-- 动画专题列表 -->
        <div class="topic-content">
            <!-- 骨架加载 -->
            <div v-if="loading && !topics.length" class="topic-grid">
                <div v-for="i in 6" :key="`skeleton-${i}`" class="topic-card">
                    <a-skeleton active>
                        <template #skeleton>
                            <div class="skeleton-cover">
                                <a-skeleton-image style="width: 100%; height: 100px; border-radius: 8px;" />
                            </div>
                            <div class="skeleton-info">
                                <a-skeleton-input style="width: 80%; margin-bottom: 8px;" size="small" />
                                <a-skeleton-input style="width: 60%;" size="small" />
                            </div>
                        </template>
                    </a-skeleton>
                </div>
            </div>

            <!-- 实际数据 -->
            <div v-else-if="topics.length" class="topic-grid">
                <div v-for="topic in topics" :key="topic.path_word" class="topic-card">
                    <div class="topic-cover">
                        <a-image :src="topic.cover" :alt="topic.title" :preview="false"
                            style="width: 100%; height: 100px; object-fit: cover;" />
                    </div>
                    <div class="topic-info">
                        <h4 class="topic-title" :title="topic.title">{{ topic.title }}</h4>
                        <div class="topic-meta">
                            <span class="topic-date">{{ formatDate(topic.datetime_created) }}</span>
                            <span class="topic-journal" v-if="topic.journal">{{ topic.journal }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <a-empty v-else description="暂无专题数据" />
        </div>

        <!-- 加载更多 -->
        <div class="load-more" v-if="topics.length && hasMore">
            <a-button @mouseenter="loadMore" :loading="loadingMore" type="default" block>
                加载更多
            </a-button>
        </div>

        <!-- 无更多数据提示 -->
        <div class="no-more" v-if="topics.length && !hasMore">
            <a-divider>已加载全部内容</a-divider>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { getCartoonTopics } from '../../api/cartoon'
import { formatDate } from '../../utils/date'

// 缓存key
const CACHE_KEY = 'cartoon_topics_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

const topics = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const limit = ref(18)
const offset = ref(0)

const hasMore = computed(() => topics.value.length < total.value)

// 获取缓存数据
const getCachedData = () => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()

    if (now - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY)
        return null
    }

    return data
}

// 设置缓存数据
const setCachedData = (data) => {
    const cacheData = {
        data,
        timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
}

const loadTopics = (isLoadMore = false, forceRefresh = false) => {
    // 如果不是加载更多且不是强制刷新，先尝试从缓存获取数据
    if (!isLoadMore && !forceRefresh) {
        const cachedData = getCachedData()
        if (cachedData) {
            topics.value = cachedData.topics
            total.value = cachedData.total
            console.log('从缓存加载动画专题数据')
            return Promise.resolve({ success: true, fromCache: true })
        }
    }

    if (isLoadMore) {
        loadingMore.value = true
        offset.value = topics.value.length
    } else {
        loading.value = true
        offset.value = 0
    }

    return getCartoonTopics(limit.value, offset.value).then(response => {
        console.log('动画专题API响应:', response)

        // 处理响应数据结构
        const responseData = response.data || response
        console.log('响应数据:', responseData)

        if (responseData && responseData.results) {
            const newTopics = responseData.results.list || []
            console.log('专题列表:', newTopics)

            if (isLoadMore) {
                topics.value.push(...newTopics)
            } else {
                topics.value = newTopics
                // 只在首次加载时缓存数据
                setCachedData({
                    topics: newTopics,
                    total: responseData.results.total || 0
                })
            }

            total.value = responseData.results.total || 0
            console.log('专题总数:', total.value, '当前专题数量:', topics.value.length)
            return { success: true, fromCache: false }
        } else {
            console.warn('响应数据格式不正确:', responseData)
            return { success: false, error: { message: '数据格式错误' } }
        }
    }).catch(err => {
        console.error('获取动画专题失败:', err)
        message.error('获取动画专题失败')
        return { success: false, error: err }
    }).finally(() => {
        loading.value = false
        loadingMore.value = false
    })
}

const loadMore = () => {
    if (!hasMore.value || loadingMore.value) return
    loadTopics(true)
}

// 刷新数据
const refreshTopics = () => {
    loadTopics(false, true).then(result => {
        if (result.success && !result.fromCache) {
            message.success('刷新成功')
        } else if (result.error) {
            console.error('刷新失败:', result.error)
        }
    })
}

onMounted(() => {
    loadTopics(false)
})
</script>

<style lang="scss" src="../../assets/styles/cartoon-topic-tab.scss" scoped></style>
