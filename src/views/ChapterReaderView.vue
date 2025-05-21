<template>
    <div class="reader-container">
        <!-- 顶部章节导航栏 - 始终显示 -->
        <div class="reader-header" v-if="chapterInfo.comic_name">
            <div class="reader-title">
                <h1>{{ chapterInfo.comic_name }}</h1>
                <h2>{{ chapterInfo.name }}</h2>
            </div>
            <div class="reader-controls">
                <button @click="goBack" class="control-button">返回</button>
                <button @click="prevChapter" class="control-button" :disabled="!hasPrevChapter">上一话</button>
                <button @click="nextChapter" class="control-button" :disabled="!hasNextChapter">下一话</button>
            </div>
        </div>

        <!-- 漫画图片区域 -->
        <div class="image-section">
            <div v-if="loading" class="loading">
                <a-spin tip="加载图片中..."></a-spin>
            </div>
            <div v-else-if="error" class="error">
                {{ error }}
                <div class="retry-container">
                    <button @click="fetchChapterImages" class="retry-button">重试加载图片</button>
                    <button @click="goBack" class="retry-button secondary">返回</button>
                </div>
            </div>
            <div v-else class="reader">
                <div class="chapter-info" v-if="chapterInfo.datetime_created">
                    <span class="info-item">更新时间: {{ chapterInfo.datetime_created }}</span>
                    <span class="info-item">{{ chapterInfo.count }}页</span>
                </div>
                <div class="image-container">
                    <!-- 两列图片布局，从右到左的日漫格式 -->
                    <div class="manga-row" v-for="(chunk, rowIndex) in imageChunks" :key="rowIndex">
                        <div class="manga-column right" v-if="chunk[1]">
                            <img :src="chunk[1].url" :alt="`第${rowIndex * 2 + 2}页`" class="manga-image"
                                loading="lazy" />
                        </div>
                        <div class="manga-column left">
                            <img :src="chunk[0].url" :alt="`第${rowIndex * 2 + 1}页`" class="manga-image"
                                loading="lazy" />
                        </div>
                    </div>
                </div>
                <div class="reader-footer">
                    <div class="reader-controls">
                        <button @click="prevChapter" class="control-button" :disabled="!hasPrevChapter">上一话</button>
                        <button @click="nextChapter" class="control-button" :disabled="!hasNextChapter">下一话</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 漫画评论区 - 独立模块 -->
        <div class="comments-section">
            <a-divider>评论区</a-divider>
            <a-typography-title :level="4">评论 ({{ comments.length }})</a-typography-title>

            <div v-if="commentsError" class="comments-error">
                <a-alert type="error" message="加载评论失败" :description="commentsError" />
                <a-button type="primary" @click="fetchComments" class="retry-comments-button">
                    重试加载评论
                </a-button>
            </div> <a-spin :spinning="loadingComments" tip="加载评论中...">
                <div v-if="!commentsError && comments.length > 0" class="compact-comments-container">
                    <a-comment v-for="(item, index) in comments" :key="index" :author="item.user_name"
                        :avatar="item.user_avatar" :content="item.comment" :datetime="formatCommentTime(item.create_at)"
                        class="compact-comment-item" />
                </div>
                <a-empty v-else-if="!commentsError && comments.length === 0" description="暂无评论" />
            </a-spin>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue' // 增加导入 nextTick
import { useRoute, useRouter } from 'vue-router'
import { getChapterImages, getChapterComments } from '../api/manga'

const route = useRoute()
const router = useRouter()
const chapterInfo = ref({})
const images = ref([])
const allChapters = ref([])
const currentChapterIndex = ref(-1)
const loading = ref(true)
const error = ref('')
const currentPrevChapterId = ref(null)
const currentNextChapterId = ref(null)

// 评论相关 - 独立状态管理
const comments = ref([])
const loadingComments = ref(false)
const commentsError = ref('') // 评论独立的错误状态

// 计算属性：将图片分成两张一组
const imageChunks = computed(() => {
    const chunks = []
    for (let i = 0; i < images.value.length; i += 2) {
        chunks.push(images.value.slice(i, i + 2))
    }
    return chunks
})

// 计算属性：是否有上一章
const hasPrevChapter = computed(() => {
    return currentPrevChapterId.value !== null || currentChapterIndex.value > 0
})

// 计算属性：是否有下一章
const hasNextChapter = computed(() => {
    return currentNextChapterId.value !== null || currentChapterIndex.value < allChapters.value.length - 1
})

// 返回漫画详情页
const goBack = () => {
    router.push(`/manga/${route.params.pathWord}`)
}

// 跳转到上一章
const prevChapter = () => {
    if (hasPrevChapter.value) {
        // 如果有API返回的上一章ID，优先使用
        if (currentPrevChapterId.value) {
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: route.params.pathWord,
                    chapterId: currentPrevChapterId.value
                },
                query: {
                    chapters: route.query.chapters,
                    index: currentChapterIndex.value - 1
                }
            })
        } else if (currentChapterIndex.value > 0) {
            // 否则使用章节列表导航
            const prevChapter = allChapters.value[currentChapterIndex.value - 1]
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: route.params.pathWord,
                    chapterId: prevChapter.id
                },
                query: {
                    chapters: route.query.chapters,
                    index: currentChapterIndex.value - 1
                }
            })
        }
    }
}

// 跳转到下一章
const nextChapter = () => {
    if (hasNextChapter.value) {
        // 如果有API返回的下一章ID，优先使用
        if (currentNextChapterId.value) {
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: route.params.pathWord,
                    chapterId: currentNextChapterId.value
                },
                query: {
                    chapters: route.query.chapters,
                    index: currentChapterIndex.value + 1
                }
            })
        } else if (currentChapterIndex.value < allChapters.value.length - 1) {
            // 否则使用章节列表导航
            const nextChapter = allChapters.value[currentChapterIndex.value + 1]
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: route.params.pathWord,
                    chapterId: nextChapter.id
                },
                query: {
                    chapters: route.query.chapters,
                    index: currentChapterIndex.value + 1
                }
            })
        }
    }
}

// 获取章节图片数据 - 独立加载流程
const fetchChapterImages = () => {
    loading.value = true
    error.value = ''

    // 从URL参数获取章节列表
    if (route.query.chapters) {
        try {
            allChapters.value = JSON.parse(decodeURIComponent(route.query.chapters))
            currentChapterIndex.value = route.query.index ? parseInt(route.query.index) : -1
        } catch (err) {
            console.error('解析章节数据失败', err)
        }
    }

    getChapterImages(route.params.pathWord, route.params.chapterId)
        .then(response => {
            if (response && response.code === 200 && response.results) {
                const chapterData = response.results.chapter
                const comicData = response.results.comic

                // 保存章节相关信息
                chapterInfo.value = {
                    comic_name: comicData.name,
                    name: chapterData.name,
                    datetime_created: chapterData.datetime_created,
                    count: chapterData.size || chapterData.contents.length
                }

                // 保存导航相关ID
                currentPrevChapterId.value = chapterData.prev
                currentNextChapterId.value = chapterData.next

                // 保存图片数据
                images.value = chapterData.contents.map(image => {
                    // 直接使用原始URL
                    return {
                        url: image.url
                    };
                });
            } else {
                throw new Error('获取章节图片失败')
            }
        })
        .catch(err => {
            console.error('获取章节图片失败', err)
            error.value = '获取章节图片失败，请稍后重试'
        })
        .finally(() => {
            loading.value = false
            // 滚动到顶部
            nextTick(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            })
        })
}

// 格式化评论时间
const formatCommentTime = (timeStr) => {
    const date = new Date(timeStr)
    const now = new Date()

    // 同一天内显示时间
    if (date.toDateString() === now.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }

    // 超过一天显示日期和时间
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 获取章节评论 - 完全独立的加载过程
const fetchComments = () => {
    if (!route.params.chapterId) return

    loadingComments.value = true
    commentsError.value = '' // 重置错误状态

    getChapterComments(route.params.chapterId, 100, 0)
        .then(response => {
            if (response && response.code === 200 && response.results) {
                comments.value = response.results.list || []
            } else {
                throw new Error('获取评论数据失败')
            }
        })
        .catch(error => {
            console.error('获取评论失败', error)
            commentsError.value = '获取评论失败，请点击重试按钮重新加载'
        })
        .finally(() => {
            loadingComments.value = false
        })
}

onMounted(() => {
    // 并行发起两个独立的请求，但互不影响
    fetchChapterImages()

    // 短暂延迟后再加载评论，避免两个请求同时发出导致的性能问题
    setTimeout(() => {
        fetchComments()
    }, 300)
})

// 监听路由参数 chapterId 的变化 - 完全独立的两个监听器
// 监听器1：章节ID变化时更新漫画图片
watch(() => route.params.chapterId, (newChapterId, oldChapterId) => {
    if (newChapterId && newChapterId !== oldChapterId) {
        // 滚动到顶部，以便用户看到新章节的开头
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 仅更新图片部分
        fetchChapterImages()
    }
}, { immediate: false })

// 监听器2：章节ID变化时更新评论
watch(() => route.params.chapterId, (newChapterId, oldChapterId) => {
    if (newChapterId && newChapterId !== oldChapterId) {
        // 延迟加载评论，优先处理图片加载
        setTimeout(() => {
            fetchComments()
        }, 500)
    }
}, { immediate: false })

</script>

<style scoped>
@import '../assets/styles/chapterReader.css';

/* 深度选择器，确保能修改Ant Design组件内部样式 */
:deep(.compact-comment-item .ant-comment-inner) {
    padding: 6px 0;
}

:deep(.compact-comment-item .ant-comment-content-author) {
    margin-bottom: 6px;
}

:deep(.compact-comment-item .ant-comment-content-detail) {
    font-size: 14px;
    line-height: 1.4;
}

:deep(.compact-comment-item .ant-comment-avatar img) {
    width: 32px;
    height: 32px;
}
</style>
