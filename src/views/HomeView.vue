<template>
    <div class="home">
        <a-spin :spinning="loading" style="width:100%">
            <!-- 搜索区 -->
            <a-card style="margin-bottom: 10px;">
                <a-space direction="vertical" size="large" style="width: 100%;">
                    <a-input-search v-model:value="searchKeyword" placeholder="输入漫画名进行搜索" enter-button="搜索" size="large"
                        @search="onSearch" style="max-width: 400px; margin: 0 auto; display: block;" />
                    <div style="text-align: center;">
                        <a-button type="primary" @click="refreshHomeData" :loading="homeStore.isLoading"
                            :disabled="loading" size="small">
                            刷新主页数据
                        </a-button>
                        <span v-if="homeStore.lastUpdateTime" style="margin-left: 12px; color: #999; font-size: 12px;">
                            上次更新: {{ formatTime(homeStore.lastUpdateTime) }}
                        </span>
                    </div>
                </a-space>
            </a-card>

            <!-- 搜索结果 -->
            <a-card v-if="searchResults.length > 0 || (searchSearched && searchLoading)" style="margin-bottom: 20px;">
                <a-spin :spinning="searchLoading" style="width:100%">
                    <div v-if="searchResults.length > 0" class="search-grid">
                        <a-row :gutter="24">
                            <a-col v-for="item in searchResults" :key="item.path_word" :xs="24" :sm="12" :md="8"
                                :lg="6">
                                <a-card hoverable class="manga-card" @click="goToDetail(item)">
                                    <img :src="item.cover" :alt="item.name" class="manga-cover" />
                                    <div class="manga-title">{{ item.name }}</div>
                                    <div class="manga-author" v-if="item.author && item.author.length">
                                        作者: {{item.author.map(a => a.name).join(', ')}}
                                    </div>
                                    <div class="manga-popular">人气: {{ item.popular }}</div>
                                </a-card>
                            </a-col>
                        </a-row>
                    </div>
                    <a-pagination v-if="searchTotal > searchPageSize" :current="searchPage" :page-size="searchPageSize"
                        :total="searchTotal" show-size-changer :page-size-options="['12', '24', '36', '48']"
                        @change="onPageChange" @showSizeChange="onPageSizeChange"
                        style="margin: 16px 0; text-align: center;" />
                    <a-empty v-else-if="searchSearched && !searchLoading && searchResults.length === 0"
                        description="暂无搜索结果" style="margin-top: 16px;" />
                </a-spin>
            </a-card>

            <!-- 轮播图 -->
            <a-card v-if="homeData.banners && homeData.banners.length > 0" style="margin-bottom: 10px;">
                <template #title>
                    <a-button type="text" @click="showBanners = !showBanners" style="padding: 0;">
                        轮播图
                        <DownOutlined v-if="!showBanners" />
                        <UpOutlined v-if="showBanners" />
                    </a-button>
                </template>
                <div v-show="showBanners">
                    <a-carousel autoplay>
                        <div v-for="banner in homeData.banners" :key="banner.type + banner.out_uuid"
                            class="banner-item">
                            <img v-if="showBanners" :src="banner.cover" :alt="banner.brief" class="banner-image" />
                            <div class="banner-text">{{ banner.brief }}</div>
                        </div>
                    </a-carousel>
                </div>
            </a-card>

            <!-- 推荐漫画 -->
            <a-card v-if="homeData.recComics && homeData.recComics.list && homeData.recComics.list.length > 0"
                style="margin-bottom: 10px;">
                <template #title>
                    <a-button type="text" @click="showRecommended = !showRecommended" style="padding: 0;">
                        推荐漫画
                        <DownOutlined v-if="!showRecommended" />
                        <UpOutlined v-if="showRecommended" />
                    </a-button>
                </template>
                <div v-show="showRecommended">
                    <a-row :gutter="16">
                        <a-col v-for="item in homeData.recComics.list" :key="item.comic.path_word" :xs="12" :sm="8"
                            :md="6" :lg="4">
                            <a-card hoverable class="manga-card" @click="goToDetail(item.comic)">
                                <img v-if="showRecommended" :src="item.comic.cover" :alt="item.comic.name"
                                    class="manga-cover" />
                                <div class="manga-title">{{ item.comic.name }}</div>
                                <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                            </a-card>
                        </a-col>
                    </a-row>
                </div>
            </a-card>

            <!-- 排行榜 -->
            <a-row :gutter="20">
                <a-col :xs="24" :md="8"
                    v-if="homeData.rankDayComics && homeData.rankDayComics.list && homeData.rankDayComics.list.length > 0">
                    <a-card title="日排行榜" style="margin-bottom: 20px;">
                        <div v-for="(item, index) in homeData.rankDayComics.list.slice(0, 10)"
                            :key="item.comic.path_word" class="rank-item" @click="goToDetail(item.comic)">
                            <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                            <img :src="item.comic.cover" :alt="item.comic.name" class="rank-cover" />
                            <div class="rank-info">
                                <div class="rank-title">{{ item.comic.name }}</div>
                                <div class="rank-popular">{{ item.comic.popular }}</div>
                            </div>
                        </div>
                    </a-card>
                </a-col>
                <a-col :xs="24" :md="8"
                    v-if="homeData.rankWeekComics && homeData.rankWeekComics.list && homeData.rankWeekComics.list.length > 0">
                    <a-card title="周排行榜" style="margin-bottom: 20px;">
                        <div v-for="(item, index) in homeData.rankWeekComics.list.slice(0, 10)"
                            :key="item.comic.path_word" class="rank-item" @click="goToDetail(item.comic)">
                            <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                            <img :src="item.comic.cover" :alt="item.comic.name" class="rank-cover" />
                            <div class="rank-info">
                                <div class="rank-title">{{ item.comic.name }}</div>
                                <div class="rank-popular">{{ item.comic.popular }}</div>
                            </div>
                        </div>
                    </a-card>
                </a-col>
                <a-col :xs="24" :md="8"
                    v-if="homeData.rankMonthComics && homeData.rankMonthComics.list && homeData.rankMonthComics.list.length > 0">
                    <a-card title="月排行榜" style="margin-bottom: 20px;">
                        <div v-for="(item, index) in homeData.rankMonthComics.list.slice(0, 10)"
                            :key="item.comic.path_word" class="rank-item" @click="goToDetail(item.comic)">
                            <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                            <img :src="item.comic.cover" :alt="item.comic.name" class="rank-cover" />
                            <div class="rank-info">
                                <div class="rank-title">{{ item.comic.name }}</div>
                                <div class="rank-popular">{{ item.comic.popular }}</div>
                            </div>
                        </div>
                    </a-card>
                </a-col>
            </a-row>

            <!-- 热门漫画 -->
            <a-card v-if="homeData.hotComics && homeData.hotComics.length > 0" title="热门漫画"
                style="margin-bottom: 10px;">
                <a-row :gutter="16">
                    <a-col v-for="item in homeData.hotComics" :key="item.comic.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4">
                        <a-card hoverable class="manga-card" @click="goToDetail(item.comic)">
                            <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
                            <div class="manga-title">{{ item.comic.name }}</div>
                            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-card>

            <!-- 新作漫画 -->
            <a-card v-if="homeData.newComics && homeData.newComics.length > 0" title="新作漫画"
                style="margin-bottom: 10px;">
                <a-row :gutter="16">
                    <a-col v-for="item in homeData.newComics" :key="item.comic.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4">
                        <a-card hoverable class="manga-card" @click="goToDetail(item.comic)">
                            <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
                            <div class="manga-title">{{ item.comic.name }}</div>
                            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-card>

            <!-- 完结漫画 -->
            <a-card v-if="homeData.finishComics && homeData.finishComics.list && homeData.finishComics.list.length > 0"
                title="完结漫画" style="margin-bottom: 10px;">
                <a-row :gutter="16">
                    <a-col v-for="comic in homeData.finishComics.list" :key="comic.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4">
                        <a-card hoverable class="manga-card" @click="goToDetail(comic)">
                            <img :src="comic.cover" :alt="comic.name" class="manga-cover" />
                            <div class="manga-title">{{ comic.name }}</div>
                            <div class="manga-popular">人气: {{ comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-card>
        </a-spin>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { searchManga } from '../api/manga'
import { useMangaStore } from '../stores/manga'
import { useHomeStore } from '../stores/home'

const router = useRouter()
const mangaStore = useMangaStore()
const homeStore = useHomeStore()

// 搜索相关
const searchKeyword = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchSearched = ref(false)
const searchPage = ref(1)
const searchPageSize = ref(12)
const searchTotal = ref(0)

// 主页数据使用 store
const homeData = computed(() => homeStore.homeData)
const loading = computed(() => homeStore.isLoading)

// 折叠状态
const showBanners = ref(false)
const showRecommended = ref(false)

// 时间格式化函数 - 显示相对时间
const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day

    if (diff < minute) {
        return '刚刚'
    } else if (diff < hour) {
        const minutes = Math.floor(diff / minute)
        return `${minutes}分钟前`
    } else if (diff < day) {
        const hours = Math.floor(diff / hour)
        return `${hours}小时前`
    } else if (diff < week) {
        const days = Math.floor(diff / day)
        return `${days}天前`
    } else if (diff < month) {
        const weeks = Math.floor(diff / week)
        return `${weeks}周前`
    } else if (diff < year) {
        const months = Math.floor(diff / month)
        return `${months}个月前`
    } else {
        const years = Math.floor(diff / year)
        return `${years}年前`
    }
}

// 获取主页数据
const fetchHomeData = () => {
    homeStore.fetchHomeData()
}

// 刷新主页数据
const refreshHomeData = () => {
    homeStore.fetchHomeData(true)
}

const fetchSearch = () => {
    if (!searchKeyword.value.trim()) return
    searchLoading.value = true
    searchSearched.value = true
    searchManga(searchKeyword.value, searchPageSize.value, (searchPage.value - 1) * searchPageSize.value)
        .then(res => {
            if (res && res.code === 200 && res.results && res.results.list) {
                searchResults.value = res.results.list
                searchTotal.value = res.results.total || 0
            } else {
                searchResults.value = []
                searchTotal.value = 0
            }
        })
        .catch(() => {
            searchResults.value = []
            searchTotal.value = 0
        })
        .finally(() => {
            searchLoading.value = false
        })
}

const onSearch = () => {
    searchPage.value = 1
    fetchSearch()
}

const onPageChange = (page, pageSize) => {
    searchPage.value = page
    searchPageSize.value = pageSize
    fetchSearch()
}

const onPageSizeChange = (current, size) => {
    searchPage.value = 1
    searchPageSize.value = size
    fetchSearch()
}

const goToDetail = (item) => {
    mangaStore.setCurrentManga(item)
    router.push(`/manga/${item.path_word}`)
}

onMounted(() => {
    fetchHomeData()
})
</script>

<style src="../assets/styles/home-view.scss" scoped></style>