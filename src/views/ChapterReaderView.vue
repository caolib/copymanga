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
                    <a-row v-for="(chunk, rowIndex) in imageChunks" :key="rowIndex" :gutter="16" class="manga-row"
                        justify="center" align="middle">
                        <a-col :span="12" class="manga-column right" v-if="chunk[1]">
                            <img v-if="!chunk[1].isPlaceholder" :src="chunk[1].url" :alt="`第${rowIndex * 2 + 2}页`"
                                class="manga-image" loading="lazy" />
                            <div v-else class="manga-image placeholder"></div>
                        </a-col>
                        <a-col :span="12" class="manga-column left">
                            <img v-if="!chunk[0].isPlaceholder" :src="chunk[0].url" :alt="`第${rowIndex * 2 + 1}页`"
                                class="manga-image" loading="lazy" />
                            <div v-else class="manga-image placeholder"></div>
                        </a-col>
                    </a-row>
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
import { getChapterImages } from '../api/manga'
import { getChapterComments } from '../api/comment'
import { useMangaStore } from '../stores/manga' // 导入漫画存储

const route = useRoute()
const router = useRouter()
const mangaStore = useMangaStore() // 使用漫画存储
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

// 计算属性：将图片分成两张一组，若为奇数则补空白
const imageChunks = computed(() => {
    const arr = [...images.value]
    if (arr.length % 2 === 1) {
        arr.push({ url: '', isPlaceholder: true }) // 补空白
    }
    const chunks = []
    for (let i = 0; i < arr.length; i += 2) {
        chunks.push(arr.slice(i, i + 2))
    }
    return chunks
})

// 计算属性：是否有上一章
const hasPrevChapter = computed(() => {
    // 首先检查API返回的上一章ID
    if (currentPrevChapterId.value !== null) return true;
    // 然后检查pinia中的章节信息
    return mangaStore.hasPrevChapter;
})

// 计算属性：是否有下一章
const hasNextChapter = computed(() => {
    // 首先检查API返回的下一章ID
    if (currentNextChapterId.value !== null) return true;
    // 然后检查pinia中的章节信息
    return mangaStore.hasNextChapter;
})

// 返回漫画详情页
const goBack = () => {
    router.push(`/manga/${mangaStore.pathWord || route.params.pathWord}`);
}

// 跳转到上一章
const prevChapter = () => {
    if (hasPrevChapter.value) {
        // 如果有API返回的上一章ID，优先使用
        if (currentPrevChapterId.value) {
            const prevChapterId = currentPrevChapterId.value;

            // 在Pinia中查找索引并更新
            const prevIndex = mangaStore.findChapterIndex(prevChapterId);
            if (prevIndex !== -1) {
                mangaStore.setCurrentChapterIndex(prevIndex);
            }

            // 跳转到上一章
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord || route.params.pathWord,
                    chapterId: prevChapterId
                }
            });
        } else if (mangaStore.hasPrevChapter) {
            // 使用pinia中的章节信息
            const prevIndex = mangaStore.currentChapterIndex - 1;
            const prevChapter = mangaStore.currentChapters[prevIndex];

            mangaStore.setCurrentChapterIndex(prevIndex);
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord,
                    chapterId: prevChapter.id
                }
            });
        }
    }
}

// 跳转到下一章
const nextChapter = () => {
    if (hasNextChapter.value) {
        // 如果有API返回的下一章ID，优先使用
        if (currentNextChapterId.value) {
            const nextChapterId = currentNextChapterId.value;

            // 在Pinia中查找索引并更新
            const nextIndex = mangaStore.findChapterIndex(nextChapterId);
            if (nextIndex !== -1) {
                mangaStore.setCurrentChapterIndex(nextIndex);
            }

            // 跳转到下一章
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord || route.params.pathWord,
                    chapterId: nextChapterId
                }
            });
        } else if (mangaStore.hasNextChapter) {
            // 使用pinia中的章节信息
            const nextIndex = mangaStore.currentChapterIndex + 1;
            const nextChapter = mangaStore.currentChapters[nextIndex];

            mangaStore.setCurrentChapterIndex(nextIndex);
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord,
                    chapterId: nextChapter.id
                }
            });
        }
    }
}

// 获取章节图片数据 - 独立加载流程
const fetchChapterImages = () => {
    loading.value = true
    error.value = ''

    // 从Pinia中获取章节信息，并更新本地状态
    if (mangaStore.currentChapters.length > 0) {
        allChapters.value = mangaStore.currentChapters

        // 根据当前章节ID查找索引
        if (route.params.chapterId) {
            const index = mangaStore.findChapterIndex(route.params.chapterId)
            if (index !== -1) {
                currentChapterIndex.value = index
                // 同步更新Pinia中的当前章节索引
                mangaStore.setCurrentChapterIndex(index)
            }
        } else {
            currentChapterIndex.value = mangaStore.currentChapterIndex
        }
    }

    getChapterImages(route.params.pathWord, route.params.chapterId)
        .then(response => {
            if (response && response.code === 200 && response.results) {
                const chapterData = response.results.chapter
                const comicData = response.results.comic                // 保存章节相关信息
                chapterInfo.value = {
                    comic_name: comicData.name,
                    name: chapterData.name,
                    datetime_created: chapterData.datetime_created,
                    count: chapterData.size || chapterData.contents.length
                }

                // 保存导航相关ID
                currentPrevChapterId.value = chapterData.prev
                currentNextChapterId.value = chapterData.next

                // 如果pinia中的漫画名称为空，则更新
                if (mangaStore.currentManga === null || !mangaStore.currentManga.name) {
                    mangaStore.setCurrentManga({
                        name: comicData.name,
                        pathWord: route.params.pathWord
                    })
                }

                // 将当前章节ID对应的索引更新到pinia
                const chapterId = route.params.chapterId
                if (chapterId) {
                    const index = mangaStore.findChapterIndex(chapterId)
                    if (index !== -1 && index !== mangaStore.currentChapterIndex) {
                        mangaStore.setCurrentChapterIndex(index)
                    }
                }

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
    // 检查是否有有效的章节数据
    if (!route.params.chapterId || (!mangaStore.currentChapters.length && !mangaStore.pathWord)) {
        // 数据不完整，返回首页
        console.error('缺少必要的章节数据')
        router.push('/')
        return
    }

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
</style>
