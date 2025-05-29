<template>
    <div class="collection-container">
        <a-page-header title="我的书架" class="collection-header">
            <template #extra>
                <div class="header-actions">
                    <a-select v-model:value="ordering" style="width: 180px; margin-right: 12px;"
                        @change="onOrderingChange">
                        <a-select-option value="-datetime_updated">按漫画更新时间排序</a-select-option>
                        <a-select-option value="-datetime_modifier">按加入书架时间排序</a-select-option>
                        <a-select-option value="-datetime_browse">按阅读时间排序</a-select-option>
                    </a-select>
                    <a-button type="primary" @click="refreshCollection" :loading="loading">
                        刷新
                    </a-button>
                    <a-typography-text type="secondary" v-if="lastUpdateTime && !loading">
                        上次更新: {{ formatUpdateTime(lastUpdateTime) }}
                    </a-typography-text>
                </div>
            </template>
        </a-page-header>

        <a-alert v-if="error" type="error" :message="error" show-icon banner style="margin-bottom: 20px" />

        <a-empty v-if="!loading && !error && validMangaList.length === 0" description="您的书架还是空的，快去收藏喜欢的漫画吧！" />

        <!-- 骨架屏加载状态 -->
        <div v-if="loading" class="manga-grid">
            <a-card v-for="n in 8" :key="n" class="manga-card skeleton-card">
                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                    <template #avatar>
                        <div class="skeleton-cover"></div>
                    </template>
                </a-skeleton>
            </a-card>
        </div>

        <!-- 实际内容 -->
        <div v-else-if="!error && validMangaList.length > 0">
            <div class="manga-grid">
                <a-card v-for="item in validMangaList" :key="item.uuid || item.id" hoverable class="manga-card"
                    @click="goToManga(item)">
                    <div class="manga-cover">
                        <img :src="item.comic.cover" :alt="item.comic.name" />
                        <div class="last-read" v-if="item.last_browse && item.last_browse.last_browse_name">
                            上次阅读: {{ item.last_browse.last_browse_name }}
                        </div>
                        <a-badge
                            v-if="item.last_browse && item.last_browse.last_browse_name && item.comic.last_chapter_name && item.last_browse.last_browse_name !== item.comic.last_chapter_name"
                            count="有更新"
                            style="position: absolute; top: 8px; right: 8px; z-index: 2; background: #ff4d4f; color: #fff; font-size: 12px; border-radius: 8px; padding: 0 8px;" />
                    </div>
                    <a-card-meta :title="item.comic.name">
                        <template #description>
                            <div class="manga-author" v-if="item.comic.author && item.comic.author.length">
                                {{item.comic.author.map(a => a.name).join(', ')}}
                            </div>
                            <div class="manga-update">
                                更新至: {{ item.comic.last_chapter_name }}
                            </div>
                            <div class="manga-datetime-updated" v-if="item.comic.datetime_updated">
                                更新时间: {{ formatDatetimeUpdated(item.comic.datetime_updated) }}
                            </div>
                        </template>
                    </a-card-meta>
                </a-card>
            </div>

            <!-- 分页组件 -->
            <a-pagination v-if="totalCount > pageSize" :current="currentPage" :page-size="pageSize" :total="totalCount"
                :show-size-changer="true" :page-size-options="['12', '24', '36', '48']" :show-quick-jumper="true"
                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`" @change="onPageChange"
                @showSizeChange="onPageSizeChange" style="margin-top: 24px; text-align: center;" />
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCollectionStore } from '../stores/collection'
import { isLoggedIn } from '../utils/auth'
import { message } from 'ant-design-vue'
import { getMyCollectionRaw } from '../api/manga'
import { formatDatetimeUpdated } from '../utils/date'

const router = useRouter()
const collectionStore = useCollectionStore()

const ordering = ref('-datetime_updated')
const mangaList = ref([])
const loading = ref(false)
const error = ref('')
const lastUpdateTime = ref(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(12)
const totalCount = ref(0)

// 过滤有效的漫画数据，防止渲染错误
const validMangaList = computed(() => {
    return mangaList.value.filter(item => item && item.comic && item.comic.name)
})

const formatUpdateTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const goToManga = (item) => {
    // 安全检查：确保数据完整
    if (!item || !item.comic || !item.comic.path_word) {
        message.error('漫画数据异常，无法跳转')
        return
    }

    // 将漫画基本信息保存到Pinia
    collectionStore.setCurrentManga(item.comic)

    // 跳转到详情页，携带来自书架和上次阅读信息
    router.push({
        name: 'MangaDetail',
        params: { pathWord: item.comic.path_word },
        query: {
            from: 'collection',
            lastBrowse: item.last_browse ? JSON.stringify(item.last_browse) : null
        }
    })
}

const fetchCollection = async () => {
    loading.value = true
    error.value = ''

    await getMyCollectionRaw({
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
        free_type: 1,
        ordering: ordering.value
    }).then(res => {
        // 安全检查：确保返回数据结构正确
        if (res && res.results && Array.isArray(res.results.list)) {
            mangaList.value = res.results.list
            totalCount.value = res.results.total || 0
        } else {
            // 数据结构异常，清空列表
            mangaList.value = []
            totalCount.value = 0
            console.warn('API返回数据结构异常:', res)
        }
        lastUpdateTime.value = new Date().toISOString()
    }).catch((err) => {
        error.value = err.message || '获取书架失败'
        mangaList.value = []
        totalCount.value = 0
    }).finally(() => {
        loading.value = false
    })
}


const refreshCollection = () => {
    fetchCollection().catch(() => {
        message.error('书架更新失败，请稍后重试')
    })
}

// 分页事件处理
const onPageChange = (page, size) => {
    currentPage.value = page
    pageSize.value = size
    fetchCollection()
}

const onPageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    fetchCollection()
}

const onOrderingChange = () => {
    currentPage.value = 1
    fetchCollection()
}

onMounted(() => {
    if (!isLoggedIn()) {
        message.warning('请先登录')
        router.push('/login')
        return
    }
    fetchCollection()
})
</script>

<style scoped>
.collection-container {
    padding: 0 20px 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.collection-header {
    margin-bottom: 24px;
    padding: 16px 0;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.manga-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
}

.manga-card {
    overflow: hidden;
    width: 100%;
}

.manga-card :deep(.ant-card-body) {
    padding: 12px;
}

.manga-card :deep(.ant-card-meta-title) {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.manga-card :deep(.ant-card-meta-description) {
    height: auto;
}

.manga-cover {
    position: relative;
    padding-top: 140%;
    overflow: hidden;
    margin-bottom: 8px;
}

.manga-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.last-read {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    font-size: 12px;
    text-align: center;
}

.manga-author {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.manga-update {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 4px;
}

.manga-datetime-updated {
    font-size: 11px;
    color: rgba(0, 0, 0, 0.35);
    font-style: italic;
}

/* 暗色模式下的文字颜色 */
html.dark .manga-author {
    color: rgba(255, 255, 255, 0.65);
}

html.dark .manga-update {
    color: rgba(255, 255, 255, 0.65);
}

html.dark .manga-datetime-updated {
    color: rgba(255, 255, 255, 0.45);
}

/* 骨架屏样式 */
.skeleton-card {
    pointer-events: none;
}

.skeleton-card :deep(.ant-card-body) {
    padding: 12px;
}

.skeleton-cover {
    width: 100%;
    height: 200px;
    background: #f5f5f5;
    border-radius: 6px;
    margin-bottom: 12px;
    position: relative;
    overflow: hidden;
}

.skeleton-cover::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
    0% {
        left: -100%;
    }

    100% {
        left: 100%;
    }
}

/* 响应式设计优化 */
@media (max-width: 768px) {
    .manga-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
    }

    .collection-container {
        padding: 0 16px 16px;
    }

    .header-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .header-actions .ant-select {
        width: 100% !important;
        margin-right: 0 !important;
        margin-bottom: 8px;
    }
}
</style>