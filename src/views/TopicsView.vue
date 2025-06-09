<template>
    <div class="topics-view">
        <div class="topics-container">
            <!-- 标题区域 -->
            <div class="page-header">
                <h1>专题推荐</h1>
                <p class="page-description">发现精彩的漫画专题，探索更多有趣内容</p>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container">
                <a-skeleton active :paragraph="{ rows: 8 }" />
            </div>

            <!-- 专题列表 -->
            <div v-else-if="topicsList.length > 0" class="topics-grid">
                <a-row :gutter="[24, 24]">
                    <a-col v-for="topic in topicsList" :key="topic.path_word" :xs="24" :sm="12" :md="8" :lg="6"> <a-card
                            hoverable class="topic-card" @click="goToTopicDetail(topic.path_word)">
                            <template #cover v-if="topic.cover">
                                <div class="topic-cover">
                                    <img :src="topic.cover" :alt="topic.title" />
                                    <div class="topic-overlay">
                                        <div class="topic-meta">
                                            <a-tag v-if="topic.series" :color="topic.series.color || 'blue'"
                                                size="small">
                                                {{ topic.series.name }}
                                            </a-tag>
                                            <span v-if="topic.period" class="topic-period">{{ topic.period }}</span>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <a-card-meta>
                                <template #title>
                                    <div class="topic-title" :title="topic.title">
                                        {{ topic.title }}
                                    </div>
                                </template>
                                <template #description>
                                    <div class="topic-info">
                                        <div v-if="topic.brief" class="topic-brief">
                                            {{ topic.brief }}
                                        </div>
                                        <div class="topic-date" v-if="topic.datetime_created">
                                            {{ formatDate(topic.datetime_created) }}
                                        </div>
                                    </div>
                                </template>
                            </a-card-meta>
                        </a-card>
                    </a-col>
                </a-row>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-container">
                <a-empty description="暂无专题数据">
                    <template #image>
                        <div class="empty-icon">📚</div>
                    </template>
                    <a-button type="primary" @click="refreshData">刷新数据</a-button>
                </a-empty>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '../stores/home'
import { useTopicStore } from '../stores/topic'

const router = useRouter()
const homeStore = useHomeStore()
const topicStore = useTopicStore()

const loading = ref(false)

// 从主页store中获取专题数据
const topicsList = computed(() => {
    const homeData = homeStore.homeData
    // 合并 topics 和 topicsList 的数据
    const topics = homeData.topics?.list || []
    const topicsList = homeData.topicsList?.list || []

    // 合并去重
    const allTopics = [...topics, ...topicsList]
    const uniqueTopics = allTopics.filter((topic, index, self) =>
        index === self.findIndex(t => t.path_word === topic.path_word)
    )

    return uniqueTopics
})

// 跳转到专题详情页
const goToTopicDetail = (pathWord) => {
    router.push({
        name: 'TopicDetail',
        params: { pathWord }
    })
}

// 格式化日期
const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    } catch (error) {
        return dateStr
    }
}

// 刷新数据
const refreshData = async () => {
    loading.value = true
    try {
        await homeStore.fetchHomeData(true)
    } catch (error) {
        console.error('刷新专题数据失败:', error)
    } finally {
        loading.value = false
    }
}

// 初始化数据
onMounted(async () => {
    // 如果主页数据为空或过期，重新获取
    if (!homeStore.hasCache || homeStore.isCacheExpired) {
        loading.value = true
        try {
            await homeStore.fetchHomeData()
        } catch (error) {
            console.error('获取主页数据失败:', error)
        } finally {
            loading.value = false
        }
    }

    // 将专题数据设置到专题store中
    topicStore.setTopicsList(topicsList.value)
})
</script>

<style scoped src="../assets/styles/topics.scss" lang="scss"></style>
