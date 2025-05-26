<template>
    <a-card class="manga-detail-container" :bordered="false">
        <a-row :gutter="32">
            <a-col :xs="24" :sm="8">
                <a-image :src="manga.cover" :alt="manga.name" width="100%" height="350px"
                    style="border-radius: 8px; object-fit: cover;"
                    fallback="https://via.placeholder.com/250x350?text=No+Image" />
            </a-col>
            <a-col :xs="24" :sm="16">
                <a-typography-title :level="2">{{ manga.name || '漫画详情' }}</a-typography-title>
                <a-descriptions :column="1" size="small" bordered>
                    <a-descriptions-item label="作者" v-if="manga.author && manga.author.length">
                        <a-tag v-for="a in manga.author" :key="a.name">{{ a.name }}</a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="题材" v-if="manga.theme && manga.theme.length">
                        <a-tag v-for="t in manga.theme" :key="t.name" color="blue">{{ t.name }}</a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="状态" v-if="manga.status">
                        <a-tag color="green">{{ manga.status.display }}</a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="人气" v-if="manga.popular">
                        {{ manga.popular }}
                    </a-descriptions-item>
                    <a-descriptions-item label="最新章节" v-if="manga.last_chapter && manga.last_chapter.name">
                        {{ manga.last_chapter.name }}
                    </a-descriptions-item>
                    <a-descriptions-item label="更新时间" v-if="manga.datetime_updated">
                        {{ formatDate(manga.datetime_updated) }}
                    </a-descriptions-item>
                </a-descriptions>
                <div style="margin: 24px 0 0 0;">
                    <a-button type="primary" @click="startReading" :disabled="!chapters.length"
                        style="margin-right: 10px">
                        开始阅读
                    </a-button>
                    <a-button @click="handleCollect" :loading="collectLoading"
                        style="margin-right: 10px">加入书架</a-button>
                    <a-button danger @click="handleCollect(false)" :loading="collectLoading"
                        style="margin-right: 10px">取消收藏</a-button>
                    <a-button @click="fetchMangaData" :loading="loading">刷新数据</a-button>
                </div>
                <div style="margin-top: 20px;">
                    <a-typography-title :level="4">简介</a-typography-title>
                    <a-typography-paragraph>{{ manga.brief || '暂无简介' }}</a-typography-paragraph>
                </div>
            </a-col>
        </a-row>
        <a-divider />
        <a-row justify="space-between" align="middle" style="margin-bottom: 12px;">
            <a-col>
                <a-button @click="toggleSortOrder" size="small">
                    {{ isAscending ? '正序' : '倒序' }}
                </a-button>
            </a-col>
        </a-row>
        <a-skeleton :loading="loading" active>
            <a-row :gutter="[12, 12]">
                <a-col :xs="12" :sm="8" :md="6" :lg="4" :xl="3" v-for="chapter in sortedChapters" :key="chapter.id">
                    <a-card :hoverable="true" @click="goToChapter(chapter)"
                        style="cursor:pointer; text-align:center; padding:0;" size="small"
                        :body-style="{ padding: '12px 6px' }">
                        <span style="font-size:14px;">{{ chapter.name }}</span>
                    </a-card>
                </a-col>
            </a-row>
        </a-skeleton>
    </a-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMangaDetail, collectManga, getMangaChapters } from '../api/manga'
import { decryptMangaData, processChapterData } from '../utils/crypto'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const manga = ref({})
const chapters = ref([])
const loading = ref(true)
const collectLoading = ref(false)
const isAscending = ref(false)

const sortedChapters = computed(() => {
    return [...chapters.value].sort((a, b) => isAscending.value ? a.index - b.index : b.index - a.index)
})

const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
}

const toggleSortOrder = () => {
    isAscending.value = !isAscending.value
}

const goToChapter = (chapter) => {
    router.push({
        name: 'ChapterReader',
        params: {
            pathWord: manga.value.path_word,
            chapterId: chapter.id
        }
    })
}

const startReading = () => {
    if (chapters.value.length > 0) {
        const firstChapter = isAscending.value ? chapters.value[0] : chapters.value[chapters.value.length - 1]
        goToChapter(firstChapter)
    }
}

const fetchMangaData = async () => {
    // 获取漫画详情信息
    const pathWord = route.params.pathWord
    await getMangaDetail(pathWord).then(res => {
        manga.value = res.results.comic
    })

    // 获取漫画章节
    loading.value = true
    await getMangaChapters(pathWord).then(res => {
        const decryptedData = decryptMangaData(res.results)
        chapters.value = processChapterData(decryptedData)
    }).catch((error) => {
        console.error('获取漫画详情或章节失败', error)
        message.error('获取漫画详情或章节失败')
    }).finally(() => {
        loading.value = false
    })
}

// 收藏或取消收藏漫画
const handleCollect = (isCollect = true) => {
    collectManga(manga.value.uuid, isCollect).then(res => {
        message.success('success')
    }).catch(err => {
        message.error(err.message)
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
