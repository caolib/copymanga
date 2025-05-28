<template>
    <a-card class="manga-detail-container" :bordered="false">
        <a-skeleton :loading="detailLoading" active avatar>
            <template #skeleton>
                <a-row :gutter="32">
                    <a-col :xs="24" :sm="8">
                        <a-skeleton-image style="width: 100%; height: 350px; border-radius: 8px;" />
                    </a-col>
                    <a-col :xs="24" :sm="16">
                        <a-skeleton-input style="width: 60%; margin-bottom: 16px;" size="large" />
                        <a-skeleton paragraph active :rows="6" />
                        <div style="margin: 24px 0;">
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" />
                        </div>
                        <a-skeleton-input style="width: 20%; margin-bottom: 12px;" />
                        <a-skeleton paragraph :rows="3" />
                    </a-col>
                </a-row>
            </template>

            <a-row :gutter="32">
                <a-col :xs="24" :sm="8">
                    <a-image :src="manga.cover" :alt="manga.name" width="100%" height="350px"
                        style="border-radius: 8px; object-fit: cover;" :placeholder="true"
                        :fallback="defaultCoverImage">
                        <template #placeholder>
                            <div class="image-placeholder">
                                <a-spin size="large" />
                                <div style="margin-top: 12px; color: #666;">加载中...</div>
                            </div>
                        </template>
                        <template #error>
                            <div class="image-error">
                                <div class="error-icon">📖</div>
                                <div class="error-text">暂无封面</div>
                            </div>
                        </template>
                    </a-image>
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
                        <!-- 来自书架时显示继续阅读按钮 -->
                        <a-button v-if="fromCollection && lastBrowseInfo && lastBrowseInfo.last_browse_id"
                            type="primary" @click="continueReading" style="margin-right: 10px">
                            继续阅读
                        </a-button>
                        <!-- 常规开始阅读按钮 -->
                        <a-button v-else type="primary" @click="startReading" :disabled="!chapters.length"
                            style="margin-right: 10px">
                            开始阅读
                        </a-button>

                        <!-- 根据来源显示不同的收藏按钮 -->
                        <template v-if="fromCollection">
                            <!-- 来自书架只显示取消收藏按钮 -->
                            <a-button danger @click="handleCollect(false)" :loading="collectLoading"
                                style="margin-right: 10px">取消收藏</a-button>
                        </template>
                        <template v-else>
                            <!-- 其他来源显示完整的收藏按钮 -->
                            <a-button @click="handleCollect" :loading="collectLoading"
                                style="margin-right: 10px">加入书架</a-button>
                            <a-button danger @click="handleCollect(false)" :loading="collectLoading"
                                style="margin-right: 10px">取消收藏</a-button>
                        </template>

                        <a-button @click="fetchMangaData" :loading="detailLoading">刷新数据</a-button>
                    </div>
                    <div style="margin-top: 20px;">
                        <a-typography-title :level="4">简介</a-typography-title>

                        <!-- 来自书架时显示上次阅读信息 -->
                        <div v-if="fromCollection && lastBrowseInfo" class="last-browse-info">
                            <a-alert :message="`上次阅读: ${lastBrowseInfo.last_browse_name || '未知章节'}`" type="info"
                                show-icon style="margin-bottom: 16px;"
                                :description="lastBrowseInfo.datetime_browse ? `阅读时间: ${formatDate(lastBrowseInfo.datetime_browse)}` : null" />
                        </div>

                        <a-typography-paragraph>{{ manga.brief || '暂无简介' }}</a-typography-paragraph>
                    </div>
                </a-col>
            </a-row>
        </a-skeleton>
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
                        :body-style="{ padding: '12px 6px' }"
                        :class="{ 'last-read-chapter': isLastReadChapter(chapter) }">
                        <span style="font-size:14px;">{{ chapter.name }}</span>
                        <!-- 显示"上次阅读"标记 -->
                        <div v-if="isLastReadChapter(chapter)" class="last-read-tag">
                            上次阅读
                        </div>
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
const detailLoading = ref(true)
const collectLoading = ref(false)
const isAscending = ref(false)

// 来自书架的特殊功能相关状态
const fromCollection = ref(false)
const lastBrowseInfo = ref(null)

// 默认封面图片 - base64 编码的简单图片
const defaultCoverImage = ref('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03MCA5MEg5MFY3MEgxMTBWOTBIMTMwVjExMEgxMTBWMTMwSDkwVjExMEg3MFY5MFoiIGZpbGw9IiNEOUQ5RDkiLz4KPHRleHQgeD0iMTAwIiB5PSIxODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5pqC5peg5bCB6Z2iPC90ZXh0Pgo8L3N2Zz4=')

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

// 继续阅读功能
const continueReading = () => {
    if (lastBrowseInfo.value && lastBrowseInfo.value.last_browse_id) {
        // 查找上次阅读的章节
        const lastChapter = chapters.value.find(ch => ch.id === lastBrowseInfo.value.last_browse_id)
        if (lastChapter) {
            goToChapter(lastChapter)
        } else {
            message.warning('未找到上次阅读的章节，将从第一章开始')
            startReading()
        }
    } else {
        startReading()
    }
}

// 检查是否为上次阅读的章节
const isLastReadChapter = (chapter) => {
    return fromCollection.value &&
        lastBrowseInfo.value &&
        lastBrowseInfo.value.last_browse_id === chapter.id
}

const fetchMangaData = async () => {
    detailLoading.value = true
    const pathWord = route.params.pathWord

    // 获取漫画详情信息
    await getMangaDetail(pathWord).then(res => {
        manga.value = res.results.comic
    }).catch((error) => {
        console.error('获取漫画详情失败', error)
        message.error('获取漫画详情失败')
    }).finally(() => {
        detailLoading.value = false
    })

    // 获取漫画章节
    loading.value = true
    await getMangaChapters(pathWord).then(res => {
        const decryptedData = decryptMangaData(res.results)
        chapters.value = processChapterData(decryptedData)
    }).catch((error) => {
        console.error('获取漫画章节失败', error)
        message.error('获取漫画章节失败')
    }).finally(() => {
        loading.value = false
    })
}

// 收藏或取消收藏漫画
const handleCollect = (isCollect = true) => {
    collectLoading.value = true
    collectManga(manga.value.uuid, isCollect).then(res => {
        message.success(isCollect ? '收藏成功' : '取消收藏成功')
    }).catch(err => {
        message.error(err.message)
    }).finally(() => {
        collectLoading.value = false
    })
}

onMounted(() => {
    // 检查是否来自书架
    if (route.query.from === 'collection') {
        fromCollection.value = true

        // 解析上次阅读信息
        if (route.query.lastBrowse) {
            try {
                lastBrowseInfo.value = JSON.parse(route.query.lastBrowse)
            } catch (e) {
                console.warn('解析上次阅读信息失败:', e)
                lastBrowseInfo.value = null
            }
        }
    }

    fetchMangaData()
})
</script>

<style scoped>
.manga-detail-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 350px;
    background-color: #f5f5f5;
    border-radius: 8px;
    color: #666;
}

.image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 350px;
    background-color: #fafafa;
    border-radius: 8px;
    color: #999;
}

.error-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.error-text {
    font-size: 14px;
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

/* 上次阅读章节的样式 */
.last-read-chapter {
    position: relative;
    border: 2px solid #1890ff !important;
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%) !important;
}

.last-read-chapter:hover {
    border-color: #40a9ff !important;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3) !important;
}

.last-read-tag {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #1890ff;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
    z-index: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
