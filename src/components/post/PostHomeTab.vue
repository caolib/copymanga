<template>
    <div class="post-home-tab">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <a-skeleton active :paragraph="{ rows: 8 }" />
        </div> <!-- 首页内容 -->
        <div v-else class="home-content">
            <div class="header-actions">
                <a-button type="primary" :size="'small'" :icon="h(ReloadOutlined)" :loading="refreshLoading"
                    @click="refreshData">
                    刷新
                </a-button>
                <span v-if="lastUpdated" class="update-time">上次更新: {{ formatLastUpdated }}</span>
            </div>
            <!-- 轮播图 -->
            <div v-if="banners.length > 0" class="banners-section">
                <a-collapse v-model:activeKey="activeCollapseKey">
                    <a-collapse-panel key="1" header="轮播推荐">
                        <a-carousel autoplay :dots="true">
                            <div v-for="banner in banners" :key="banner.out_uuid" class="banner-item">
                                <div class="banner-content" @click="handleBannerClick(banner)">
                                    <img :src="banner.cover" :alt="banner.brief" />
                                    <div class="banner-overlay">
                                        <h3>{{ banner.brief }}</h3>
                                    </div>
                                </div>
                            </div>
                        </a-carousel>
                    </a-collapse-panel>
                </a-collapse>
            </div> <!-- 最新写真 -->
            <div v-if="newPosts.length > 0" class="section">
                <div class="section-header">
                    <h2>最新写真</h2>
                </div>
                <a-row :gutter="[16, 16]">
                    <a-col v-for="item in newPosts.slice(0, 8)" :key="item.post.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4" :xl="4">
                        <a-card hoverable class="post-card" @click="goToPostDetail(item.post)">
                            <template #cover>
                                <div class="post-cover">
                                    <img :src="item.post.cover" :alt="item.post.name" @error="handleImageError" />
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
            </div><!-- 排行榜 -->
            <a-row :gutter="[20, 20]">
                <!-- 周排行榜 -->
                <a-col :xs="24" :lg="12" v-if="weekRanking.length > 0">
                    <div class="section">
                        <div class="section-header">
                            <h2>周排行榜</h2>
                        </div>
                        <a-row :gutter="[16, 16]">
                            <a-col v-for="item in weekRanking.slice(0, 8)" :key="item.post.path_word" :xs="12" :sm="12"
                                :md="8" :lg="12" :xl="8">
                                <a-card hoverable class="post-card" @click="goToPostDetail(item.post)">
                                    <template #cover>
                                        <div class="post-cover">
                                            <img :src="item.post.cover" :alt="item.post.name"
                                                @error="handleImageError" />
                                            <div class="ranking-badge">{{ item.sort }}</div>
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
                                                <div class="post-popular">人气: {{ formatNumber(item.popular) }}</div>
                                            </div>
                                        </template>
                                    </a-card-meta>
                                </a-card>
                            </a-col>
                        </a-row>
                    </div>
                </a-col>

                <!-- 月排行榜 -->
                <a-col :xs="24" :lg="12" v-if="monthRanking.length > 0">
                    <div class="section">
                        <div class="section-header">
                            <h2>月排行榜</h2>
                        </div>
                        <a-row :gutter="[16, 16]">
                            <a-col v-for="item in monthRanking.slice(0, 8)" :key="item.post.path_word" :xs="12" :sm="12"
                                :md="8" :lg="12" :xl="8">
                                <a-card hoverable class="post-card" @click="goToPostDetail(item.post)">
                                    <template #cover>
                                        <div class="post-cover">
                                            <img :src="item.post.cover" :alt="item.post.name"
                                                @error="handleImageError" />
                                            <div class="ranking-badge">{{ item.sort }}</div>
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
                                                <div class="post-popular">人气: {{ formatNumber(item.popular) }}</div>
                                            </div>
                                        </template>
                                    </a-card-meta>
                                </a-card>
                            </a-col>
                        </a-row>
                    </div>
                </a-col>
            </a-row>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import { message } from 'ant-design-vue'
import { usePostHomeStore } from '../../stores/post-home'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'

const router = useRouter()
const postHomeStore = usePostHomeStore()

const refreshLoading = ref(false)
const activeCollapseKey = ref(['0'])

// 从 store 中获取数据
const loading = computed(() => postHomeStore.loading)
const banners = computed(() => postHomeStore.banners)
const newPosts = computed(() => postHomeStore.newPosts)
const weekRanking = computed(() => postHomeStore.weekRanking)
const monthRanking = computed(() => postHomeStore.monthRanking)
const lastUpdated = computed(() => postHomeStore.lastUpdated)
const formatLastUpdated = computed(() => {
    if (!lastUpdated.value) return ''
    return formatDate(lastUpdated.value)
})

// 获取首页数据
const fetchHomeData = async () => {
    await postHomeStore.fetchHomeData().catch(err => {
        message.error('获取写真首页数据失败')
    })
}

// 刷新数据
const refreshData = async () => {
    refreshLoading.value = true

    await postHomeStore.fetchHomeData(true).then(() => {
        message.success('数据刷新成功')
    }).catch(err => {
        message.error('刷新数据失败')
    }).finally(() => {
        refreshLoading.value = false
    })
}

// 跳转到写真详情
const goToPostDetail = (post) => {
    router.push({
        name: 'PostDetail',
        params: { postId: post.uuid }
    })
}

// 处理轮播图点击
const handleBannerClick = (banner) => {
    if (banner.comic?.path_word) {
        // 轮播图中comic对象使用path_word作为ID
        router.push({
            name: 'PostDetail',
            params: { postId: banner.comic.path_word }
        })
    }
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

// 组件挂载时获取数据
onMounted(() => {
    fetchHomeData()
})
</script>

<style scoped src="../../assets/styles/post-home-tab.scss" lang="scss"></style>
