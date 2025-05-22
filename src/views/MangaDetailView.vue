<template>
    <div class="manga-detail-container">

        <div class="manga-detail">
            <div class="manga-header">
                <div class="manga-cover">
                    <img :src="manga.cover" :alt="manga.name" />
                </div>
                <div class="manga-info">
                    <h1 class="manga-title">{{ manga.name || '漫画详情' }}</h1>
                    <div class="manga-metadata">
                        <div class="metadata-item" v-if="manga.author && manga.author.length">
                            <span class="label">作者:</span>
                            <span class="value">{{manga.author.map(a => a.name).join(', ')}}</span>
                        </div>
                        <div class="metadata-item" v-if="manga.theme && manga.theme.length">
                            <span class="label">题材:</span>
                            <span class="value">{{manga.theme.map(t => t.name).join(', ')}}</span>
                        </div>
                        <div class="metadata-item" v-if="manga.status">
                            <span class="label">状态:</span>
                            <span class="value">{{ manga.status.name }}</span>
                        </div>
                        <div class="metadata-item" v-if="manga.last_chapter_name">
                            <span class="label">最新章节:</span>
                            <span class="value">{{ manga.last_chapter_name }}</span>
                        </div>
                        <div class="metadata-item" v-if="manga.datetime_updated">
                            <span class="label">更新时间:</span>
                            <span class="value">{{ formatDate(manga.datetime_updated) }}</span>
                        </div>
                    </div>
                    <div class="manga-actions">
                        <button class="action-button primary" @click="startReading"
                            :disabled="!chapters.length">开始阅读</button>
                        <button class="action-button">加入书架</button>
                    </div>
                </div>
            </div>

            <div class="manga-description" v-if="manga.brief">
                <h2>作品简介</h2>
                <p>{{ manga.brief }}</p>
            </div>

            <div class="manga-chapters" v-if="chapters.length">
                <h2>章节列表</h2>
                <div class="chapters-header">
                    <span>共 {{ chapters.length }} 章</span>
                    <div class="chapters-sort">
                        <button @click="toggleSortOrder" class="sort-button">
                            {{ isAscending ? '正序' : '倒序' }}
                        </button>
                    </div>
                </div>
                <div class="chapters-grid">
                    <div v-for="chapter in sortedChapters" :key="chapter.uuid" class="chapter-item"
                        @click="goToChapter(chapter)">
                        {{ chapter.name }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMangaChapters, getMangaDetail } from '../api/manga'
import { decryptMangaData, processChapterData } from '../utils/crypto'
import { useMangaStore } from '../stores/manga' // 导入漫画存储

const route = useRoute()
const router = useRouter()
const mangaStore = useMangaStore() // 使用漫画存储
const manga = ref({})
const chapters = ref([])
const loading = ref(true)
const error = ref('')
const isAscending = ref(false)

const sortedChapters = computed(() => {
    return [...chapters.value].sort((a, b) => {
        if (isAscending.value) {
            return a.index - b.index
        } else {
            return b.index - a.index
        }
    })
})

const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
}

const toggleSortOrder = () => {
    isAscending.value = !isAscending.value
}

const goToChapter = (chapter) => {
    // 将漫画基本信息、章节列表和当前章节索引保存到pinia中
    mangaStore.setCurrentManga(manga.value)
    mangaStore.setChapters(chapters.value, route.params.pathWord)

    // 找出当前章节在数组中的索引
    const chapterIndex = chapters.value.findIndex(c => c.id === chapter.id)
    mangaStore.setCurrentChapterIndex(chapterIndex)

    // 跳转到阅读页面，只传递必要的参数
    router.push({
        name: 'ChapterReader',
        params: {
            pathWord: route.params.pathWord,
            chapterId: chapter.id
        }
    })
}

// 开始阅读功能 - 从第一章开始
const startReading = () => {
    if (chapters.value.length > 0) {
        // 根据排序方式决定从哪个章节开始
        const firstChapter = isAscending.value ? chapters.value[0] : chapters.value[chapters.value.length - 1]
        goToChapter(firstChapter)
    }
}

const fetchMangaData = () => {
    loading.value = true
    error.value = ''

    // 首先检查Pinia中是否已有漫画数据
    if (mangaStore.currentManga && mangaStore.pathWord === route.params.pathWord) {
        // 使用Pinia中的数据
        manga.value = mangaStore.currentManga
        
        // 如果Pinia中也有章节数据，则一并使用
        if (mangaStore.currentChapters.length > 0) {
            chapters.value = mangaStore.currentChapters
            loading.value = false
            return // 直接返回，不再请求数据
        }
    }

    // 同时请求漫画详情和章节列表
    const pathWord = route.params.pathWord

    // 请求1: 获取漫画详情
    getMangaDetail(pathWord)
        .then(detailResult => {
            if (detailResult && detailResult.code === 200 && detailResult.results) {
                manga.value = detailResult.results
                
                // 将获取的漫画数据保存到Pinia
                mangaStore.setCurrentManga(detailResult.results)
            } else {
                throw new Error('获取漫画详情失败')
            }
        })
        .catch(err => {
            console.error('获取漫画详情失败', err)
            error.value = '获取漫画详情失败，请稍后重试'
        })

    // 请求2: 获取章节列表
    getMangaChapters(pathWord)
        .then(chaptersResult => {
            if (chaptersResult && chaptersResult.code === 200 && chaptersResult.results) {
                // 解密章节数据
                const decryptedData = decryptMangaData(chaptersResult.results)
                // 处理章节数据
                chapters.value = processChapterData(decryptedData)
                
                // 将章节数据保存到Pinia
                mangaStore.setChapters(chapters.value, pathWord)
            } else {
                throw new Error('获取章节列表失败')
            }
        })
        .catch(err => {
            console.error('获取漫画章节失败', err)
            error.value = '获取漫画章节失败，请稍后重试'
        })
        .finally(() => {
            loading.value = false
        })
}

onMounted(() => {
    fetchMangaData()
})
</script>

<style scoped>
.manga-detail-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.loading,
.error {
    text-align: center;
    padding: 50px 0;
    font-size: 18px;
    color: #666;
}

.error {
    color: #ff3333;
}

.manga-header {
    display: flex;
    gap: 30px;
    margin-bottom: 30px;
}

.manga-cover {
    flex: 0 0 250px;
    height: 350px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.manga-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.manga-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.manga-title {
    font-size: 28px;
    margin: 0 0 15px;
    font-weight: bold;
}

.manga-metadata {
    margin-bottom: 20px;
}

.metadata-item {
    margin-bottom: 10px;
    font-size: 16px;
}

.label {
    color: #666;
    margin-right: 8px;
    font-weight: 500;
}

.value {
    color: #333;
}

.manga-actions {
    margin-top: auto;
    display: flex;
    gap: 15px;
}

.action-button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s;
}

.action-button.primary {
    background-color: #4a89dc;
    color: white;
}

.action-button.primary:hover {
    background-color: #3a70c1;
}

.action-button:not(.primary) {
    background-color: #f5f5f5;
    color: #333;
}

.action-button:not(.primary):hover {
    background-color: #e5e5e5;
}

.manga-description {
    margin-bottom: 30px;
}

.manga-description h2 {
    font-size: 20px;
    margin-bottom: 15px;
    font-weight: bold;
}

.manga-description p {
    line-height: 1.6;
    white-space: pre-line;
    color: #333;
}

.manga-chapters h2 {
    font-size: 20px;
    margin-bottom: 15px;
    font-weight: bold;
}

.chapters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.sort-button {
    padding: 5px 10px;
    background-color: #f5f5f5;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.sort-button:hover {
    background-color: #e5e5e5;
}

.chapters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
}

.chapter-item {
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
}

.chapter-item:hover {
    background-color: #e5e5e5;
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .manga-header {
        flex-direction: column;
    }

    .manga-cover {
        width: 200px;
        height: 280px;
        margin: 0 auto 20px;
    }

    .chapters-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
}
</style>
