<template>
    <div class="collection-container">
        <a-card title="我的轻小说书架" class="collection-card">
            <!-- 操作栏 -->
            <template #extra>
                <a-space>
                    <!-- 更新时间信息 -->
                    <div v-if="lastUpdateTime" class="update-info header-update-info">
                        <a-typography-text type="secondary">
                            最后更新：{{ formatDate(lastUpdateTime) }}
                        </a-typography-text>
                    </div>
                    <a-select v-model:value="ordering" @change="handleOrderingChange" style="width: 120px">
                        <a-select-option value="-datetime_modifier">收藏时间</a-select-option>
                        <a-select-option value="-datetime_updated">更新时间</a-select-option>
                        <a-select-option value="-datetime_browse">阅读时间</a-select-option>
                    </a-select>
                    <a-button type="primary" @click="refreshCollection" :loading="loading">
                        刷新
                    </a-button>
                </a-space>
            </template>

            <!-- 内容区域 -->
            <!-- 错误信息 -->
            <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />

            <!-- 空状态 -->
            <a-empty v-if="!loading && validBookList.length === 0" description="还没有收藏任何轻小说">
                <a-button type="primary" @click="$router.push('/')">去首页看看</a-button>
            </a-empty>

            <!-- 轻小说列表 -->
            <a-row v-else :gutter="[20, 20]">
                <a-col v-for="item in validBookList" :key="item.uuid" :xs="24" :sm="12" :md="8" :lg="6" :xl="6"
                    :xxl="4">
                    <a-card hoverable class="book-card" @click="goToBook(item)">
                        <div class="book-cover-container">
                            <img :src="item.book.cover" :alt="item.book.name" class="book-cover"
                                @error="$event.target.src = '/logo.png'" />
                            <!-- 阅读进度 -->
                            <div v-if="item.last_browse" class="reading-progress">
                                <a-tag color="blue" size="small">
                                    {{ item.last_browse.last_browse_name || '继续阅读' }}
                                </a-tag>
                            </div>
                        </div>
                        <div class="book-info">
                            <div class="book-title" :title="item.book.name">{{ item.book.name }}</div>
                            <div class="book-author" v-if="item.book.author && item.book.author.length > 0">
                                作者：{{ item.book.author[0].name }}
                            </div>
                            <div class="book-meta">
                                <span class="book-status">
                                    {{ getBookStatus(item.book) }}
                                </span>
                                <span class="book-updated" v-if="item.book.datetime_updated">
                                    {{ formatDate(item.book.datetime_updated) }}
                                </span>
                            </div>
                        </div>
                    </a-card>
                </a-col>
            </a-row>

            <!-- 分页 -->
            <div v-if="totalCount > pageSize" class="pagination-container">
                <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="totalCount"
                    :show-size-changer="true" :show-quick-jumper="true"
                    :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 本轻小说`"
                    @change="handlePageChange" @show-size-change="handlePageSizeChange" />
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '../stores/user'
import { useBookCollectionStore } from '../stores/book-collection'
import { formatDate } from '../utils/date'

const router = useRouter()
const userStore = useUserStore()
const bookCollectionStore = useBookCollectionStore()

// 数据状态
const bookList = ref([])
const loading = ref(false)
const error = ref('')
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(18)
const ordering = ref('-datetime_modifier')
const lastUpdateTime = ref(null)

// 过滤有效的轻小说数据，防止渲染错误
const validBookList = computed(() => {
    return bookList.value.filter(item => item && item.book && item.book.name)
})

const getBookStatus = (book) => {
    if (!book) return '未知'

    switch (book.status) {
        case 0:
            return '连载中'
        case 1:
            return '已完结'
        case 2:
            return '暂停'
        default:
            return '未知'
    }
}

const goToBook = (item) => {
    // 安全检查：确保数据完整
    if (!item || !item.book || !item.book.path_word) {
        message.error('轻小说数据异常，无法跳转')
        return
    }

    // 将轻小说基本信息保存到Pinia
    bookCollectionStore.setCurrentBook(item.book)

    // 跳转到详情页，携带来自书架和上次阅读信息
    router.push({
        name: 'BookDetail',
        params: { pathWord: item.book.path_word },
        query: {
            from: 'collection',
            lastBrowse: item.last_browse ? JSON.stringify(item.last_browse) : null
        }
    })
}

const fetchCollection = async (forceRefresh = false) => {
    loading.value = true
    error.value = ''

    try {
        // 使用store的缓存逻辑
        const result = await bookCollectionStore.fetchCollection({
            page: currentPage.value,
            pageSize: pageSize.value,
            ordering: ordering.value
        }, forceRefresh)

        // 更新组件状态
        bookList.value = result.data
        totalCount.value = result.total
        lastUpdateTime.value = bookCollectionStore.lastUpdateTime

        // 显示相应的成功消息
        if (forceRefresh) {
            message.success('数据已刷新')
        } else if (result.fromCache) {
            if (bookCollectionStore.isCacheExpired) {
                message.info('数据已加载（缓存已过期，建议点击刷新获取最新数据）')
            } else {
                message.success('数据已加载（来自缓存）')
            }
        } else {
            message.success('数据已加载')
        }

    } catch (err) {
        console.error('获取收藏列表失败:', err)
        error.value = err.message || '网络错误'
        message.error('获取收藏列表失败: ' + (err.message || '网络错误'))
    } finally {
        loading.value = false
    }
}

const refreshCollection = () => {
    fetchCollection(true)
}

const handlePageChange = (page, size) => {
    currentPage.value = page
    pageSize.value = size

    // 优先检查缓存
    const cacheKey = bookCollectionStore.getCacheKey(page, size, ordering.value)
    const cachedData = bookCollectionStore.collectionCache[cacheKey]

    if (cachedData) {
        // 使用缓存数据，即使过期也使用（提升用户体验）
        bookList.value = cachedData
        totalCount.value = bookCollectionStore.totalCount
        lastUpdateTime.value = bookCollectionStore.lastUpdateTime

        if (bookCollectionStore.isCacheExpired) {
            message.info('数据已加载（缓存已过期，建议点击刷新获取最新数据）')
        } else {
            message.success('数据已加载（来自缓存）')
        }
    } else {
        // 没有缓存，重新获取
        fetchCollection()
    }
}

const handlePageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size

    // 页面大小改变，重新获取数据
    fetchCollection()
}

const handleOrderingChange = () => {
    currentPage.value = 1

    // 排序改变，重新获取数据
    fetchCollection()
}

onMounted(() => {
    // 优先使用缓存数据
    if (bookCollectionStore.hasCache) {
        const cacheKey = bookCollectionStore.getCacheKey(
            currentPage.value,
            pageSize.value,
            ordering.value
        )
        const cachedData = bookCollectionStore.collectionCache[cacheKey]

        if (cachedData) {
            // 从缓存加载数据，即使过期也优先使用（提升用户体验）
            bookList.value = cachedData
            totalCount.value = bookCollectionStore.totalCount
            lastUpdateTime.value = bookCollectionStore.lastUpdateTime
            return
        }
    }

    // 没有缓存数据，从服务器获取
    fetchCollection()
})
</script>

<style src="../assets/styles/my-book-collection.scss" scoped></style>
