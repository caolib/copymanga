<template>
    <div class="topic-detail-view">
        <div class="topic-detail-container">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container">
                <a-skeleton active :paragraph="{ rows: 6 }" />
            </div>

            <!-- 专题详情 -->
            <div v-else-if="currentTopic" class="topic-detail">
                <!-- 专题头部信息 -->
                <div class="topic-header">
                    <div class="topic-cover-section">
                        <img v-if="currentTopic.cover" :src="currentTopic.cover" :alt="currentTopic.title"
                            class="topic-cover-large" />
                    </div>
                    <div class="topic-info-section">
                        <div class="topic-meta">
                            <a-tag v-if="currentTopic.series">
                                {{ currentTopic.series.name }}
                            </a-tag>
                            <span v-if="currentTopic.period" class="topic-period">{{ currentTopic.period }}</span>
                            <span v-if="currentTopic.journal" class="topic-journal">{{ currentTopic.journal }}</span>
                        </div>
                        <h1 class="topic-title">{{ currentTopic.title }}</h1>
                        <div v-if="currentTopic.intro || currentTopic.brief" class="topic-intro">
                            {{ currentTopic.intro || currentTopic.brief }}
                        </div>
                        <div class="topic-date" v-if="currentTopic.datetime_created">
                            发布时间：{{ formatDate(currentTopic.datetime_created) }}
                        </div>

                        <!-- 导航按钮 -->
                        <div class="topic-actions">
                            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)">
                                返回专题列表
                            </a-button>
                            <a-button v-if="currentTopic.last" type="default" @click="goToPrevTopic">
                                上一期：{{ currentTopic.last.title }}
                            </a-button>
                        </div>
                    </div>
                </div>

                <a-divider />

                <!-- 专题内容 -->
                <div class="topic-content-section">
                    <div class="section-header">
                        <h2>专题内容</h2>
                        <a-button type="primary" @click="refreshContent" :loading="contentLoading" size="small">
                            刷新内容
                        </a-button>
                    </div>

                    <!-- 内容加载状态 -->
                    <div v-if="contentLoading" class="content-loading">
                        <a-skeleton active :paragraph="{ rows: 10 }" />
                    </div> <!-- 漫画列表 -->
                    <div v-else-if="topicContent.length > 0" class="content-grid"> <a-row :gutter="[24, 24]">
                            <a-col v-for="item in topicContent" :key="item.path_word" :xs="12" :sm="8" :md="6" :lg="4"
                                :xl="4" :xxl="4"> <a-card hoverable class="manga-card" @click="goToDetail(item)">
                                    <template #cover>
                                        <div class="manga-cover">
                                            <img :src="item.cover" :alt="item.name" @error="handleImageError" />
                                            <div class="manga-overlay">
                                                <div class="manga-meta">
                                                    <span v-if="item.popular" class="manga-popular">
                                                        人气: {{ formatNumber(item.popular) }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>

                                    <a-card-meta>
                                        <template #title>
                                            <div class="manga-title" :title="item.name">
                                                {{ item.name }}
                                            </div>
                                        </template> <template #description>
                                            <div class="manga-info">
                                                <!-- 写真专题显示不同信息 -->
                                                <div v-if="currentTopic.type === 4">
                                                    <div v-if="item.brief" class="post-brief">
                                                        {{ item.brief }}
                                                    </div>
                                                    <div v-if="item.tags && item.tags.length > 0" class="post-tags">
                                                        <a-tag v-for="tag in item.tags.slice(0, 3)" :key="tag.path_word"
                                                            size="small">
                                                            {{ tag.name || tag.path_word }}
                                                        </a-tag>
                                                    </div>
                                                </div>
                                                <!-- 漫画专题显示原有信息 -->
                                                <div v-else>
                                                    <div v-if="item.author && item.author.length > 0"
                                                        class="manga-author">
                                                        作者：{{item.author.map(a => a.name).join(', ')}}
                                                    </div>
                                                    <div v-if="item.theme && item.theme.length > 0"
                                                        class="manga-themes">
                                                        <a-tag v-for="theme in item.theme.slice(0, 3)"
                                                            :key="theme.path_word" size="small">
                                                            {{ theme.name }}
                                                        </a-tag>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </a-card-meta>
                                </a-card>
                            </a-col>
                        </a-row>

                        <!-- 分页 -->
                        <div v-if="total > pageSize" class="pagination-container">
                            <a-pagination v-model:current="currentPage" :page-size="pageSize" :total="total"
                                show-size-changer :page-size-options="['25', '50', '100']" @change="handlePageChange"
                                @show-size-change="handlePageSizeChange" />
                        </div>
                    </div>

                    <!-- 内容为空 -->
                    <div v-else class="empty-content">
                        <a-empty description="该专题暂无内容">
                            <a-button type="primary" @click="refreshContent">重新加载</a-button>
                        </a-empty>
                    </div>
                </div>
            </div>

            <!-- 错误状态 -->
            <div v-else class="error-container">
                <a-result status="error" title="加载专题失败">
                    <template #extra>
                        <a-button type="primary" @click="fetchTopicData">重新加载</a-button>
                        <a-button @click="goBack">返回专题列表</a-button>
                    </template>
                </a-result>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTopicStore } from '../stores/topic'
import { useMangaNavigation } from '../composables/useMangaNavigation'
import { formatDate } from '../utils/date'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { formatNumber } from '@/utils/number'

const route = useRoute()
const router = useRouter()
const topicStore = useTopicStore()
const { goToMangaDetail } = useMangaNavigation()

const loading = ref(false)
const contentLoading = computed(() => topicStore.contentLoading)
const currentTopic = computed(() => topicStore.currentTopic)
const topicContent = computed(() => topicStore.currentTopicContent)
const total = computed(() => topicStore.total)
const currentPage = ref(1)
const pageSize = ref(25)

// 获取专题数据
const fetchTopicData = async () => {
    const pathWord = route.params.pathWord
    if (!pathWord) return

    loading.value = true
    try {
        // 获取专题详情
        const topicResult = await topicStore.fetchTopicInfo(pathWord)
        if (topicResult.success) {
            // 获取专题内容
            await fetchTopicContent()
        } else {
            console.error('获取专题详情失败:', topicResult.message)
        }
    } catch (error) {
        console.error('获取专题数据失败:', error)
    } finally {
        loading.value = false
    }
}

// 获取专题内容
const fetchTopicContent = async () => {
    const pathWord = route.params.pathWord
    if (!pathWord) return

    const offset = (currentPage.value - 1) * pageSize.value
    // 根据专题类型决定内容类型：4是写真专题，1是漫画专题
    const contentType = currentTopic.value?.type === 4 ? 4 : 1
    const result = await topicStore.fetchTopicContent(pathWord, contentType, offset, pageSize.value)

    if (!result.success) {
        console.error('获取专题内容失败:', result.message)
    }
}

// 刷新内容
const refreshContent = () => {
    fetchTopicContent()
}

// 处理分页变化
const handlePageChange = (page) => {
    currentPage.value = page
    fetchTopicContent()
}

// 处理页面大小变化
const handlePageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    fetchTopicContent()
}

// 返回专题列表
const goBack = () => {
    router.push('/topics')
}

// 跳转到上一期专题
const goToPrevTopic = () => {
    if (currentTopic.value?.last?.path_word) {
        router.push({
            name: 'TopicDetail',
            params: { pathWord: currentTopic.value.last.path_word }
        })
    }
}


// 跳转到详情页面（根据专题类型判断）
const goToDetail = (item) => {
    // 如果专题类型是4，则是写真专题，跳转到写真详情
    if (currentTopic.value?.type === 4) {
        router.push({
            name: 'PostDetail',
            params: { postId: item.path_word }
        })
    } else {
        // 否则是漫画专题，跳转到漫画详情
        goToMangaDetail(item)
    }
}

// 处理图片加载错误
const handleImageError = (event) => {
    event.target.src = '/logo.png'
}

// 监听路由变化
watch(() => route.params.pathWord, (newPathWord, oldPathWord) => {
    if (newPathWord && newPathWord !== oldPathWord) {
        topicStore.clearCurrentTopic()
        currentPage.value = 1
        fetchTopicData()
    }
}, { immediate: true })

// 组件挂载时清空之前的数据
onMounted(() => {
    topicStore.clearCurrentTopic()
})
</script>

<style scoped src="../assets/styles/topic-detail.scss" lang="scss"></style>
