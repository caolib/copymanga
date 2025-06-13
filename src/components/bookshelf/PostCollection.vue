<template>
    <div class="post-collection">
        <!-- 操作栏 -->
        <div class="collection-controls" v-if="!loading || postList.length > 0">
            <div class="controls-left">
                <a-select v-model:value="ordering" @change="handleOrderingChange" style="width: 180px;">
                    <a-select-option value="-datetime_updated">按写真更新时间排序</a-select-option>
                    <a-select-option value="-datetime_modifier">按加入收藏时间排序</a-select-option>
                    <a-select-option value="-datetime_browse">按浏览时间排序</a-select-option>
                </a-select>
            </div>
            <div class="controls-right">
                <span class="total-info">共收藏 {{ totalCount }} 个写真</span>
            </div>
        </div> <!-- 错误信息 -->
        <a-alert v-if="error" type="error" :message="error" show-icon style="margin-bottom: 16px" />

        <!-- 空状态 -->
        <a-empty v-if="!loading && postList.length === 0" description="还没有收藏任何写真">
            <a-button type="primary" @click="$router.push('/posts')">去看写真</a-button>
        </a-empty>

        <!-- 骨架屏加载状态 -->
        <a-row v-if="loading && postList.length === 0" :gutter="[20, 20]">
            <a-col v-for="n in 18" :key="`skeleton-${n}`" :xs="24" :sm="12" :md="8" :lg="6" :xl="6" :xxl="4">
                <a-card class="post-card skeleton-card">
                    <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                        <template #avatar>
                            <div class="skeleton-cover"></div>
                        </template>
                    </a-skeleton>
                </a-card>
            </a-col>
        </a-row>

        <!-- 写真列表 -->
        <a-row v-else-if="!loading && postList.length > 0" :gutter="[20, 20]">
            <a-col v-for="item in postList" :key="item.uuid" :xs="24" :sm="12" :md="8" :lg="6" :xl="6" :xxl="4">
                <a-card hoverable class="post-card" @click="goToPost(item)">
                    <div class="post-cover-container">
                        <img :src="item.post.cover" :alt="item.post.name" class="post-cover"
                            @error="$event.target.src = '/logo.png'" />
                        <!-- 阅读进度 -->
                        <div v-if="item.last_browse" class="reading-progress">
                            <a-tag color="purple" size="small">
                                {{ item.last_browse.last_browse_name || '继续浏览' }}
                            </a-tag>
                        </div>
                    </div>
                    <div class="post-info">
                        <div class="post-title" :title="item.post.name">{{ item.post.name }}</div>
                        <div class="post-author" v-if="item.post.author && item.post.author.length > 0">
                            作者：{{ item.post.author[0].name }}
                        </div>
                        <div class="post-meta">
                            <span class="post-updated" v-if="item.post.datetime_updated">
                                {{ formatDate(item.post.datetime_updated) }}
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
                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 个写真`" @change="handlePageChange"
                @show-size-change="handlePageSizeChange" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getPostCollection } from '../../api/post'
import { formatDate } from '../../utils/date'
import { isLoggedIn } from '../../utils/auth'

const router = useRouter()

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update-count', 'update-time'])

// 数据状态
const postList = ref([])
const loading = ref(false)
const error = ref('')
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(18)
const ordering = ref('-datetime_updated')
const lastUpdateTime = ref(null)

// 缓存数据
const postCache = ref({})

const goToPost = (item) => {
    // 安全检查：确保数据完整
    if (!item || !item.post || !item.post.path_word) {
        message.error('写真数据异常，无法跳转')
        return
    }

    // 跳转到详情页，携带来自收藏和上次浏览信息
    router.push({
        name: 'PostDetail',
        params: { postId: item.post.path_word },
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

    const cacheKey = `${currentPage.value}-${pageSize.value}-${ordering.value}`

    // 检查缓存
    if (!forceRefresh && postCache.value[cacheKey]) {
        postList.value = postCache.value[cacheKey].data
        totalCount.value = postCache.value[cacheKey].total
        lastUpdateTime.value = postCache.value[cacheKey].lastUpdateTime

        emit('update-count', totalCount.value)
        if (lastUpdateTime.value) {
            emit('update-time', lastUpdateTime.value)
        }
        return
    }

    loading.value = true
    error.value = ''

    try {
        const response = await getPostCollection(
            (currentPage.value - 1) * pageSize.value,
            pageSize.value,
            1,
            ordering.value
        )

        if (response && response.code === 200 && response.results) {
            const data = response.results.list || []
            const total = response.results.total || 0

            postList.value = data
            totalCount.value = total
            lastUpdateTime.value = new Date().toISOString()

            // 缓存数据
            postCache.value[cacheKey] = {
                data,
                total,
                lastUpdateTime: lastUpdateTime.value
            }

            // 发送数量更新事件
            emit('update-count', totalCount.value)
            emit('update-time', lastUpdateTime.value)

            if (forceRefresh) {
                message.success('写真收藏列表已刷新')
            }
        } else {
            throw new Error('API响应格式错误')
        }

    } catch (err) {
        console.error('获取写真收藏列表失败:', err)
        error.value = err.message || '网络错误'
        message.error('获取写真收藏列表失败: ' + (err.message || '网络错误'))
        totalCount.value = 0
        postList.value = []
        emit('update-count', 0)
    } finally {
        loading.value = false
    }
}

const refreshCollection = () => {
    // 清除缓存
    postCache.value = {}
    fetchCollection(true)
}

const handlePageChange = (page, size) => {
    currentPage.value = page
    pageSize.value = size
    fetchCollection()
}

const handlePageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    // 页面大小改变，清除缓存
    postCache.value = {}
    fetchCollection()
}

const handleOrderingChange = () => {
    currentPage.value = 1
    // 排序改变，清除缓存
    postCache.value = {}
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
    if (!isLoggedIn()) {
        error.value = '请先登录'
        return
    }
    fetchCollection()
})
</script>

<style scoped src="../../assets/styles/post-collection.scss" lang="scss"></style>
