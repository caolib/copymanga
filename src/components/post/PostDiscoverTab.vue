<template>
    <div class="post-discover-tab">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <a-skeleton active :paragraph="{ rows: 8 }" />
        </div>

        <!-- 内容 -->
        <div v-else class="discover-content">
            <!-- 筛选区域 -->
            <div class="filter-section">
                <div class="filter-group">
                    <div class="filter-label">排序方式</div>
                    <div class="filter-buttons">
                        <a-button :type="currentOrdering === '-datetime_updated' ? 'primary' : 'default'" size="small"
                            @click="changeOrdering('-datetime_updated')">
                            更新时间
                        </a-button>
                        <a-button :type="currentOrdering === '-popular' ? 'primary' : 'default'" size="small"
                            @click="changeOrdering('-popular')">
                            热门
                        </a-button>
                    </div>
                </div>
            </div>

            <!-- 写真卡片列表 -->
            <div class="posts-grid">
                <a-row :gutter="[16, 16]">
                    <a-col v-for="item in posts" :key="item.uuid" :xs="12" :sm="8" :md="6" :lg="4" :xl="4" :xxl="4">
                        <a-card hoverable class="post-card" @click="goToPostDetail(item.uuid)">
                            <template #cover>
                                <div class="post-cover">
                                    <img :src="item.cover" :alt="item.name" @error="handleImageError" />
                                    <div v-if="item.ticket" class="ticket-badge">{{ item.ticket }}币</div>
                                </div>
                            </template>
                            <a-card-meta>
                                <template #title>
                                    <div class="post-title" :title="item.name">
                                        {{ item.name }}
                                    </div>
                                </template>
                                <template #description>
                                    <div class="post-info">
                                        <div class="post-meta">
                                            <span class="post-date">{{ formatDate(item.datetime_updated) }}</span>
                                            <span class="post-popular">人气: {{ formatNumber(item.popular) }}</span>
                                        </div>
                                    </div>
                                </template>
                            </a-card-meta>
                        </a-card>
                    </a-col>
                </a-row>
            </div>

            <!-- 空状态 -->
            <div v-if="!loading && posts.length === 0" class="empty-container">
                <a-empty description="暂无数据">
                    <a-button type="primary" @click="refreshData">刷新</a-button>
                </a-empty>
            </div>

            <!-- 分页 -->
            <div v-if="total > pageSize" class="pagination-container">
                <a-pagination v-model:current="currentPage" :page-size="pageSize" :total="total"
                    @change="handlePageChange" :show-size-changer="true" :page-size-options="['18', '36', '72']"
                    @showSizeChange="handlePageSizeChange" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { goToPostDetail } from '@/router/post-router'
import { formatDate } from '../../utils/date'
import { discoverPost } from '../../api/post'
import { message } from 'ant-design-vue'


// 状态变量
const loading = ref(false)
const posts = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(18)
const currentOrdering = ref('-datetime_updated')
const currentTag = ref('')

// 获取发现页数据
const fetchDiscoverData = async () => {
    loading.value = true

    const offset = (currentPage.value - 1) * pageSize.value

    await discoverPost(
        '',  // 始终传入空字符串作为模特参数
        currentTag.value,
        currentOrdering.value,
        pageSize.value,
        offset
    ).then(response => {
        if (response.results) {
            posts.value = response.results.list || []
            total.value = response.results.total || 0
        }
    }).catch(err => {
        console.error('获取写真发现数据失败:', err)
        message.error('获取写真发现数据失败')
    }).finally(() => {
        loading.value = false
    })
}

// 刷新数据
const refreshData = () => {
    currentPage.value = 1
    fetchDiscoverData()
}

// 切换排序方式
const changeOrdering = (ordering) => {
    if (currentOrdering.value !== ordering) {
        currentOrdering.value = ordering
        refreshData()
    }
}

// 页码变化
const handlePageChange = (page) => {
    currentPage.value = page
    fetchDiscoverData()
}

// 每页条数变化
const handlePageSizeChange = (current, size) => {
    pageSize.value = size
    currentPage.value = 1
    fetchDiscoverData()
}

// 格式化数字
const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
}

// 处理图片加载错误
const handleImageError = (event) => {
    event.target.src = '/logo.png'
}

// 监听筛选条件变化
watch([currentOrdering, currentTag], () => {
    if (currentPage.value !== 1) {
        currentPage.value = 1
    } else {
        fetchDiscoverData()
    }
}, { deep: true })

// 组件挂载时获取数据
onMounted(() => {
    fetchDiscoverData()
})
</script>

<style scoped src="../../assets/styles/post-discover.scss" lang="scss"></style>
