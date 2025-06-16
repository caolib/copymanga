<template>
    <div class="home">

        <!-- 搜索区 -->
        <a-card style="margin-bottom: 10px;">
            <div class="search-header">
                <a-input-search v-model:value="searchKeyword" placeholder="输入漫画名进行搜索" enter-button size="large"
                    @search="onSearch" class="search-input" />
                <div class="refresh-section">
                    <a-button type="primary" @click="refreshHomeData" :icon="h(ReloadOutlined)"
                        :loading="homeStore.isLoading" :disabled="loading" size="small">
                        刷新
                    </a-button>
                    <span v-if="homeStore.lastUpdateTime" class="update-time">
                        上次更新: {{ formatDate(homeStore.lastUpdateTime) }}
                    </span>
                </div>
            </div>
        </a-card>

        <!-- 排行榜 -->
        <a-row :gutter="20" style="margin-bottom: 20px;">
            <a-col :xs="24" :md="8">
                <a-card title="日排行榜" style="margin-bottom: 20px;">
                    <div v-for="(item, index) in homeData.rankDayComics?.list?.slice(0, 10) || []"
                        :key="item.comic.path_word" class="rank-item" @click="goToMangaDetail(item.comic)">
                        <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                        <img :src="item.comic.cover" @error="handleImageError" :alt="item.comic.name"
                            class="rank-cover" />
                        <div class="rank-info">
                            <div class="rank-title">{{ item.comic.name }}</div>
                            <div class="rank-popular">{{ item.comic.popular }}</div>
                        </div>
                    </div>
                </a-card>
            </a-col>
            <a-col :xs="24" :md="8">
                <a-card title="周排行榜" style="margin-bottom: 20px;">
                    <div v-for="(item, index) in homeData.rankWeekComics?.list?.slice(0, 10) || []"
                        :key="item.comic.path_word" class="rank-item" @click="goToMangaDetail(item.comic)">
                        <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                        <img :src="item.comic.cover" @error="handleImageError" :alt="item.comic.name"
                            class="rank-cover" />
                        <div class="rank-info">
                            <div class="rank-title">{{ item.comic.name }}</div>
                            <div class="rank-popular">{{ item.comic.popular }}</div>
                        </div>
                    </div>
                </a-card>
            </a-col>
            <a-col :xs="24" :md="8">
                <a-card title="月排行榜" style="margin-bottom: 20px;">
                    <div v-for="(item, index) in homeData.rankMonthComics?.list?.slice(0, 10) || []"
                        :key="item.comic.path_word" class="rank-item" @click="goToMangaDetail(item.comic)">
                        <span class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                        <img :src="item.comic.cover" @error="handleImageError" :alt="item.comic.name"
                            class="rank-cover" />
                        <div class="rank-info">
                            <div class="rank-title">{{ item.comic.name }}</div>
                            <div class="rank-popular">{{ item.comic.popular }}</div>
                        </div>
                    </div>
                </a-card>
            </a-col>
        </a-row>

        <!-- 所有折叠面板内容 -->
        <a-collapse v-model:activeKey="activeKeys">
            <!-- 轮播图 -->
            <a-collapse-panel key="banners" header="轮播图">
                <a-carousel autoplay>
                    <div v-for="banner in homeData.banners || []" :key="banner.type + banner.out_uuid"
                        class="banner-item" @click="handleBannerClick(banner)">
                        <img :src="banner.cover" :alt="banner.brief" class="banner-image" />
                        <div class="banner-text">{{ banner.brief }}</div>
                    </div>
                </a-carousel>
            </a-collapse-panel>

            <!-- 专题推荐 -->
            <a-collapse-panel key="topics" header="专题推荐">
                <template #extra>
                    <router-link to="/topics" class="view-more-link">查看更多</router-link>
                </template>
                <a-row :gutter="16">
                    <a-col v-for="topic in homeData.topics?.list?.slice(0, 6) || []" :key="topic.path_word" :xs="24"
                        :sm="12" :md="8" :lg="4">
                        <a-card hoverable class="topic-card-mini" @click="goToTopicDetail(topic.path_word)">
                            <template #cover v-if="topic.cover">
                                <img :src="topic.cover" :alt="topic.title" class="topic-cover-mini" />
                            </template>
                            <a-card-meta>
                                <template #title>
                                    <div class="topic-title-mini" :title="topic.title">{{ topic.title }}</div>
                                </template>
                                <template #description>
                                    <div class="topic-meta-mini">
                                        <span v-if="topic.period" class="topic-period-mini">{{ topic.period
                                        }}</span>
                                        <span v-if="topic.datetime_created" class="topic-date-mini">
                                            {{ formatDate(topic.datetime_created) }}
                                        </span>
                                    </div>
                                </template>
                            </a-card-meta>
                        </a-card>
                    </a-col>
                </a-row>
            </a-collapse-panel>

            <!-- 推荐漫画 -->
            <a-collapse-panel key="recommended" header="推荐漫画">
                <a-row :gutter="16">
                    <a-col v-for="item in homeData.recComics?.list || []" :key="item.comic.path_word" :xs="12" :sm="8"
                        :md="6" :lg="4">
                        <a-card hoverable class="manga-card" @click="goToMangaDetail(item.comic)">
                            <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
                            <div class="manga-title">{{ item.comic.name }}</div>
                            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-collapse-panel>

            <!-- 热门漫画 -->
            <a-collapse-panel key="hotComics" header="热门漫画">
                <a-row :gutter="16">
                    <a-col v-for="item in homeData.hotComics || []" :key="item.comic.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4">
                        <a-card hoverable class="manga-card" @click="goToMangaDetail(item.comic)">
                            <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
                            <div class="manga-title">{{ item.comic.name }}</div>
                            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-collapse-panel>

            <!-- 新作漫画 -->
            <a-collapse-panel key="newComics" header="新作漫画">
                <a-row :gutter="16">
                    <a-col v-for="item in homeData.newComics || []" :key="item.comic.path_word" :xs="12" :sm="8" :md="6"
                        :lg="4">
                        <a-card hoverable class="manga-card" @click="goToMangaDetail(item.comic)">
                            <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
                            <div class="manga-title">{{ item.comic.name }}</div>
                            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-collapse-panel>

            <!-- 完结漫画 -->
            <a-collapse-panel key="finishComics" header="完结漫画">
                <a-row :gutter="16">
                    <a-col v-for="comic in homeData.finishComics?.list || []" :key="comic.path_word" :xs="12" :sm="8"
                        :md="6" :lg="4">
                        <a-card hoverable class="manga-card" @click="goToMangaDetail(comic)">
                            <img :src="comic.cover" :alt="comic.name" class="manga-cover" />
                            <div class="manga-title">{{ comic.name }}</div>
                            <div class="manga-popular">人气: {{ comic.popular }}</div>
                        </a-card>
                    </a-col>
                </a-row>
            </a-collapse-panel>
        </a-collapse>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '../stores/home'
import { useMangaNavigation } from '../composables/useMangaNavigation'
import { getCurrentApiSource } from '../config/server-config'
import { openExternalUrl } from '../utils/external-link'
import { formatDate } from '../utils/date'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { handleImageError } from '../utils/image'
import { message } from 'ant-design-vue'

const router = useRouter()
const homeStore = useHomeStore()
const { goToMangaDetail } = useMangaNavigation()

// 搜索相关
const searchKeyword = ref('')

// 主页数据使用 store
const homeData = computed(() => homeStore.homeData)
const loading = computed(() => homeStore.isLoading)

// 折叠面板激活的key
const activeKeys = ref([])

// 获取主页数据
const fetchHomeData = () => {
    const hide = message.loading('正在加载主页数据...', 0)
    homeStore.fetchHomeData().finally(() => hide())
}

// 刷新主页数据
const refreshHomeData = () => {
    homeStore.fetchHomeData(true)
}

// 处理搜索 - 跳转到搜索页面
const onSearch = () => {
    if (!searchKeyword.value.trim()) return

    router.push({
        name: 'Search',
        query: {
            q: searchKeyword.value
        }
    })
}


// 处理轮播图点击
const handleBannerClick = (banner) => {
    const { type, out_uuid, comic } = banner

    console.log

    if (type === 6 || type === 4) {
        // 外部链接，使用浏览器打开
        openExternalUrl(out_uuid)
    } else if (type === 3) {
        // 拼接API域名
        getCurrentApiSource().then(domain => {
            const fullUrl = domain + out_uuid
            openExternalUrl(fullUrl)
        })
    } else if (type === 1) {
        // 跳转到漫画详情页
        // console.log('跳转到漫画详情:', comic);
        goToMangaDetail(comic)
    }
}

// 跳转到专题详情页
const goToTopicDetail = (pathWord) => {
    router.push(`/topic/${pathWord}`)
}

onMounted(() => {
    fetchHomeData()
})
</script>

<style src="../assets/styles/home.scss" scoped></style>