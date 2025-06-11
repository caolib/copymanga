<template>
    <div class="post-new-tab">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <a-skeleton active :paragraph="{ rows: 8 }" />
        </div>

        <!-- 内容区域 -->
        <div v-else class="new-posts-container">
            <div class="header-actions">
                <a-button type="primary" :size="'small'" :icon="h(ReloadOutlined)" :loading="refreshLoading"
                    @click="refreshData">
                    刷新
                </a-button>
                <span v-if="lastUpdated" class="update-time">上次更新: {{ formatLastUpdated }}</span>
            </div>

            <!-- 写真列表 -->
            <div v-if="newPosts.length > 0" class="post-list">
                <a-row :gutter="[16, 16]">
                    <a-col v-for="item in newPosts" :key="item.post.uuid" :xs="12" :sm="8" :md="6" :lg="4" :xl="4"
                        :xxl="4">
                        <a-card hoverable class="post-card" @click="goToPostDetail(item.post.uuid)">
                            <template #cover>
                                <div class="post-cover">
                                    <img :src="item.post.cover" :alt="item.post.name" @error="handleImageError" />
                                    <div v-if="item.post.ticket" class="ticket-badge">{{ item.post.ticket }}币</div>
                                </div>
                            </template>
                            <a-card-meta>
                                <template #title>
                                    <div class="post-title" :title="item.post.name">
                                        {{ item.post.name }}
                                    </div>
                                </template>
                                <template #description>
                                    <div class="post-info">
                                        <div class="post-date">{{ formatDate(item.datetime_created) }}</div>
                                    </div>
                                </template>
                            </a-card-meta>
                        </a-card>
                    </a-col>
                </a-row>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-container">
                <a-empty description="暂无最新写真">
                    <a-button type="primary" @click="refreshData">刷新</a-button>
                </a-empty>
            </div>

            <!-- 分页器 -->
            <div v-if="newPosts.length > 0" class="pagination-container">
                <a-pagination v-model:current="currentPage" :total="total" :page-size="pageSize"
                    @change="handlePageChange" show-quick-jumper :show-total="totalTemplate" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '../../utils/date'
import { message } from 'ant-design-vue'
import { usePostNewStore } from '../../stores/post-new'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { goToPostDetail } from '@/router/post-router'

const postNewStore = usePostNewStore()

const refreshLoading = ref(false)

// 从 store 中获取数据
const loading = computed(() => postNewStore.loading)
const newPosts = computed(() => postNewStore.newPosts)
const total = computed(() => postNewStore.total)
const pageSize = computed(() => postNewStore.pageSize)
const currentPage = computed({
    get: () => postNewStore.currentPage,
    set: (val) => postNewStore.currentPage = val
})
const lastUpdated = computed(() => postNewStore.lastUpdated)
const formatLastUpdated = computed(() => {
    if (!lastUpdated.value) return ''
    return formatDate(lastUpdated.value)
})

// 获取最新写真数据
const fetchNewPostsData = async (page = 1) => {
    await postNewStore.fetchNewPosts(page).catch(err => {
        message.error('获取最新写真数据失败')
    })
}

// 刷新数据
const refreshData = async () => {
    refreshLoading.value = true

    await postNewStore.fetchNewPosts(currentPage.value, true).then(() => {
        message.success('数据刷新成功')
    }).catch(err => {
        message.error('刷新数据失败')
    }).finally(() => {
        refreshLoading.value = false
    })
}

// 处理页码变更
const handlePageChange = (page) => {
    fetchNewPostsData(page)
}

// 处理图片加载错误
const handleImageError = (event) => {
    event.target.src = '/logo.png'
}

// 分页总数模板
const totalTemplate = (total) => `共 ${total} 条`

// 组件挂载时获取数据
onMounted(() => {
    fetchNewPostsData()
})
</script>

<style scoped src="../../assets/styles/post-new.scss" lang="scss"></style>
