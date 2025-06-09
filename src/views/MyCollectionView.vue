<template>
    <div class="collection-container">
        <a-page-header title="收藏漫画" class="collection-header">
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
import { useMangaNavigation } from '../composables/useMangaNavigation'
import { isLoggedIn } from '../utils/auth'
import { message } from 'ant-design-vue'
import { formatDatetimeUpdated } from '../utils/date'

const router = useRouter()
const collectionStore = useCollectionStore()
const { goToMangaDetail } = useMangaNavigation()

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
    // 使用统一的导航逻辑，携带来自书架和上次阅读信息
    goToMangaDetail(item.comic, {
        query: {
            from: 'collection',
            lastBrowse: item.last_browse ? JSON.stringify(item.last_browse) : null
        }
    })
}

const fetchCollection = async (forceRefresh = false) => {
    if (!isLoggedIn()) {
        error.value = '请先登录'
        return
    }

    loading.value = true
    error.value = ''

    // 使用 store 获取数据
    const result = await collectionStore.fetchCollection({
        page: currentPage.value,
        pageSize: pageSize.value,
        ordering: ordering.value
    }, forceRefresh)

    if (result.success) {
        mangaList.value = result.data || []
        totalCount.value = result.total || 0

        if (!result.fromCache) {
            lastUpdateTime.value = new Date().toISOString()
            message.success(forceRefresh ? '收藏列表已刷新' : '收藏列表加载成功')
        }

        // 预加载下一页（如果不是强制刷新且有下一页）
        if (!forceRefresh && currentPage.value < Math.ceil(totalCount.value / pageSize.value)) {
            collectionStore.preloadNextPage(currentPage.value, pageSize.value, ordering.value)
        }
    } else {
        error.value = result.error?.message || '获取收藏列表失败'
        totalCount.value = 0
        mangaList.value = []
    }

    loading.value = false
}


const refreshCollection = () => {
    // 清除当前页缓存
    collectionStore.clearPageCache(currentPage.value, pageSize.value, ordering.value)
    // 强制刷新
    fetchCollection(true).catch(() => {
        message.error('书架更新失败，请稍后重试')
    })
}

// 分页事件处理
const onPageChange = (page, size) => {
    currentPage.value = page
    if (size !== pageSize.value) {
        pageSize.value = size
        // 页大小改变时清除所有缓存
        collectionStore.clearCache()
    }
    fetchCollection()
}

const onPageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    // 页大小改变时清除所有缓存
    collectionStore.clearCache()
    fetchCollection()
}

const onOrderingChange = () => {
    currentPage.value = 1
    // 排序改变时清除所有缓存
    collectionStore.clearCache()
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

<style src="../assets/styles/my-collection.scss" scoped></style>