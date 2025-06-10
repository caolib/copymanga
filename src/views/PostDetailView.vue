<template>
    <div class="post-detail-view">
        <div class="post-detail-container">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-container">
                <a-skeleton active :paragraph="{ rows: 6 }" />
            </div>

            <!-- 写真详情 -->
            <div v-else-if="postInfo" class="post-detail">
                <!-- 写真头部信息 -->
                <div class="post-header">
                    <div class="post-cover-section">
                        <img v-if="postInfo.cover" :src="postInfo.cover" :alt="postInfo.name" class="post-cover-large"
                            @error="handleImageError" />
                    </div>
                    <div class="post-info-section">
                        <h1 class="post-title">{{ postInfo.name }}</h1>
                        <div v-if="postInfo.brief" class="post-brief">
                            {{ postInfo.brief }}
                        </div>
                        <div class="post-meta">
                            <div v-if="postInfo.datetime_updated" class="post-date">
                                更新时间：{{ formatDate(postInfo.datetime_updated) }}
                            </div>
                            <div v-if="postInfo.read_times" class="post-read-times">
                                可阅读图片数：{{ formatNumber(postInfo.read_times) }}
                            </div>
                            <div v-if="postInfo.popular" class="post-popular">
                                人气：{{ formatNumber(postInfo.popular) }}
                            </div>
                            <div v-if="postInfo.ticket" class="post-ticket">
                                需要：{{ postInfo.ticket }} 写真币
                            </div>
                        </div>

                        <!-- 标签 -->
                        <div v-if="postInfo.tags && postInfo.tags.length > 0" class="post-tags">
                            <a-tag v-for="tag in postInfo.tags.slice(0, 6)" :key="tag.path_word" size="small">
                                {{ tag.name || tag.path_word }}
                            </a-tag>
                        </div>

                        <!-- 操作按钮 -->
                        <div class="post-actions">
                            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)">
                                返回
                            </a-button>
                            <a-button v-if="chapters.length > 0" type="primary" @click="startReading">
                                开始阅读
                            </a-button>
                        </div>
                    </div>
                </div>

                <a-divider />

                <!-- 章节列表 -->
                <div class="chapters-section">
                    <div class="section-header">
                        <h2>章节列表</h2>
                        <a-button type="primary" @click="refreshChapters" :loading="chaptersLoading" size="small">
                            刷新章节
                        </a-button>
                    </div>

                    <!-- 章节加载状态 -->
                    <div v-if="chaptersLoading" class="chapters-loading">
                        <a-skeleton active :paragraph="{ rows: 6 }" />
                    </div>

                    <!-- 章节列表 -->
                    <div v-else-if="chapters.length > 0" class="chapters-list">
                        <a-list :data-source="chapters" item-layout="horizontal">
                            <template #renderItem="{ item }">
                                <a-list-item>
                                    <template #actions>
                                        <a-button type="primary" @click="readChapter(item)">
                                            阅读
                                        </a-button>
                                    </template>
                                    <a-list-item-meta>
                                        <template #title>
                                            <span class="chapter-name">{{ item.name }}</span>
                                        </template>
                                        <template #description>
                                            <div class="chapter-info">
                                                <span class="chapter-size">{{ item.size }} 张图片</span>
                                                <span class="chapter-sort">第 {{ item.sort }} 话</span>
                                            </div>
                                        </template>
                                    </a-list-item-meta>
                                </a-list-item>
                            </template>
                        </a-list>
                    </div>

                    <!-- 章节为空 -->
                    <div v-else class="empty-chapters">
                        <a-empty description="暂无章节">
                            <a-button type="primary" @click="refreshChapters">重新加载</a-button>
                        </a-empty>
                    </div>
                </div>
            </div>

            <!-- 错误状态 -->
            <div v-else class="error-container">
                <a-result status="error" title="加载写真详情失败">
                    <template #extra>
                        <a-button type="primary" @click="fetchPostData">重新加载</a-button>
                        <a-button @click="goBack">返回</a-button>
                    </template>
                </a-result>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostInfo, getPostId } from '../api/post'
import { formatDate } from '../utils/date'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const chaptersLoading = ref(false)
const postInfo = ref(null)
const chapters = ref([])

// 获取写真信息
const fetchPostInfo = async () => {
    const postId = route.params.postId
    if (!postId) return

    loading.value = true

    await getPostInfo(postId).then(response => {
        if (response.results) {
            postInfo.value = response.results.post
        }
    }).catch(err => {
        console.error('获取写真信息失败:', err)
        message.error('获取写真信息失败')
    }).finally(() => {
        loading.value = false
    })
}

// 获取章节信息
const fetchChapters = async () => {
    const postId = route.params.postId
    if (!postId) return

    chaptersLoading.value = true

    await getPostId(postId).then(response => {
        if (response.results) {
            chapters.value = response.results.list || []
        }
    }).catch(err => {
        console.error('获取章节信息失败:', err)
        message.error('获取章节信息失败')
    }).finally(() => {
        chaptersLoading.value = false
    })
}

// 获取写真数据
const fetchPostData = async () => {
    await Promise.all([fetchPostInfo(), fetchChapters()])
}

// 刷新章节
const refreshChapters = () => {
    fetchChapters()
}

// 开始阅读（阅读第一章）
const startReading = () => {
    if (chapters.value.length > 0) {
        readChapter(chapters.value[0])
    }
}

// 阅读章节
const readChapter = (chapter) => {
    router.push({
        name: 'PostReader',
        params: {
            postId: route.params.postId,
            chapterId: chapter.id
        }
    })
}

// 格式化数字
const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
}

// 处理图片加载错误
const handleImageError = (event) => {
    event.target.src = '/logo.png'
}

// 返回上一页
const goBack = () => {
    router.go(-1)
}

// 组件挂载时获取数据
onMounted(() => {
    fetchPostData()
})
</script>

<style scoped src="../assets/styles/post-detail.scss" lang="scss"></style>