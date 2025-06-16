<template>
    <div class="manga-collection"> <!-- 操作栏 -->
        <div class="collection-controls" v-if="(!loading && !internalLoading) || mangaList.length > 0">
            <div class="controls-left">
                <a-select v-model:value="ordering" @change="onOrderingChange" style="width: 180px;"
                    :disabled="internalLoading">
                    <a-select-option value="-datetime_updated">按漫画更新时间排序</a-select-option>
                    <a-select-option value="-datetime_modifier">按加入书架时间排序</a-select-option>
                    <a-select-option value="-datetime_browse">按阅读时间排序</a-select-option>
                </a-select>
            </div>
            <div class="controls-right">
                <span class="total-info">共收藏 {{ totalCount }} 部漫画</span>
            </div>
        </div>

        <!-- 错误信息 -->
        <a-alert v-if="error" type="error" :message="error" show-icon banner style="margin-bottom: 20px" /> <!-- 空状态 -->
        <a-empty v-if="!loading && !internalLoading && !error && mangaList.length === 0" description="您还没有收藏任何漫画">
            <a-button type="primary" @click="$router.push('/')">去首页看看</a-button>
        </a-empty><!-- 骨架屏加载状态 -->
        <div v-if="loading || internalLoading" class="manga-grid">
            <a-card v-for="n in 8" :key="n" class="manga-card skeleton-card">
                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                    <template #avatar>
                        <div class="skeleton-cover"></div>
                    </template>
                </a-skeleton>
            </a-card>
        </div> <!-- 实际内容 -->
        <div v-else-if="!error && mangaList.length > 0">
            <div class="manga-grid">
                <a-card v-for="item in mangaList" :key="item.uuid || item.id" hoverable class="manga-card"
                    @click="goToManga(item)">
                    <div class="manga-cover">
                        <img :src="item.comic.cover" :alt="item.comic.name" />
                        <a-badge
                            v-if="item.last_browse && item.last_browse.last_browse_name && item.comic.last_chapter_name && item.last_browse.last_browse_name !== item.comic.last_chapter_name"
                            count="有更新"
                            style="position: absolute; top: 8px; right: 8px; z-index: 2; background: #ff4d4f; color: #fff; font-size: 12px; border-radius: 8px; padding: 0 8px;" />
                    </div>
                    <a-card-meta :title="item.comic.name" style="margin-top: 5px;">
                        <template #description>
                            <div class="manga-author" v-if="item.comic.author && item.comic.author.length">
                                {{item.comic.author.map(a => a.name).join(', ')}}
                            </div>
                            <div class="last-read" v-if="item.last_browse && item.last_browse.last_browse_name">
                                上次阅读: {{ item.last_browse.last_browse_name }}
                            </div>
                            <div class="manga-update">
                                更新至: {{ item.comic.last_chapter_name }}
                            </div>
                            <div class="manga-datetime-updated" v-if="item.comic.datetime_updated">
                                更新时间: {{ formatDate(item.comic.datetime_updated) }}
                            </div>
                        </template>
                    </a-card-meta>
                </a-card>
            </div>

            <!-- 分页组件 -->
            <a-pagination v-if="totalCount > pageSize" :current="currentPage" :page-size="pageSize" :total="totalCount"
                :show-size-changer="true" :page-size-options="['12', '24', '36', '48']" :show-quick-jumper="true"
                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`" @change="onPageChange"
                @showSizeChange="onPageSizeChange" style="margin-top: 24px; text-align: center;"
                :disabled="internalLoading" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCollectionStore } from '../../stores/collection'
import { useMangaNavigation } from '../../composables/useMangaNavigation'
import { message } from 'ant-design-vue'
import { formatDate } from '../../utils/date'

const collectionStore = useCollectionStore()
const { goToMangaDetail } = useMangaNavigation()

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update-count', 'update-time'])

const ordering = ref('-datetime_updated')
const mangaList = ref([])
const error = ref('')
const lastUpdateTime = ref(null)
const internalLoading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(12)
const totalCount = ref(0)

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
    internalLoading.value = true
    error.value = ''

    // 使用 store 获取数据
    await collectionStore.fetchCollection({
        page: currentPage.value,
        pageSize: pageSize.value,
        ordering: ordering.value
    }, forceRefresh).then(result => {
        mangaList.value = result.data || []
        totalCount.value = result.total || 0

        if (!result.fromCache) {
            lastUpdateTime.value = new Date().toISOString()
            emit('update-time', lastUpdateTime.value)
            if (forceRefresh) {
                message.success('漫画收藏列表已刷新')
            }
        } else if (result.fromCache && collectionStore.lastUpdateTime) {
            // 如果是从缓存加载，发送store中的更新时间
            lastUpdateTime.value = new Date(collectionStore.lastUpdateTime).toISOString()
            emit('update-time', lastUpdateTime.value)
        }

        // 发送数量更新事件
        emit('update-count', totalCount.value)
    }).catch(err => {
        console.error('获取收藏列表失败:', err)
        error.value = err.message || '获取收藏列表失败'
        totalCount.value = 0
        mangaList.value = []
        emit('update-count', 0)
    })

    internalLoading.value = false
}

const refreshCollection = () => {
    // 清除当前页缓存
    collectionStore.clearPageCache(currentPage.value, pageSize.value, ordering.value)
    // 强制刷新
    fetchCollection(true).catch(() => {
        message.error('刷新失败，请稍后重试')
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

// 暴露刷新方法给父组件
const refresh = () => {
    refreshCollection()
}

defineExpose({
    refresh
})

onMounted(() => {
    fetchCollection()
})
</script>

<style scoped src="../../assets/styles/manga-collection.scss"></style>
