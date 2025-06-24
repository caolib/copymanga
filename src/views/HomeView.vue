<template>
    <div class="home">
        <!-- Tab切换 -->
        <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
            <template #rightExtra>
                <a-button type="primary" @click="refreshCurrentData" :icon="h(ReloadOutlined)" :loading="loading"
                    :disabled="loading" size="small" style="margin-right: 10px;">
                    刷新
                </a-button>
                <span v-if="lastUpdateTime" class="update-time">
                    {{ formatDate(lastUpdateTime) }}
                </span>
            </template>

            <a-tab-pane key="home" tab="主页">
                <HomeTabContent />
            </a-tab-pane>

            <a-tab-pane key="newest" tab="全新上架">
                <NewestTabContent />
            </a-tab-pane>

            <a-tab-pane key="discover" tab="发现">
                <MangaDiscoverTabContent />
            </a-tab-pane>
        </a-tabs>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '../stores/home'
import { useMangaDiscoverStore } from '../stores/manga-discover'
import { formatDate } from '../utils/date'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import HomeTabContent from '../components/home/HomeTabContent.vue'
import NewestTabContent from '../components/home/NewestTabContent.vue'
import MangaDiscoverTabContent from '../components/home/MangaDiscoverTabContent.vue'

const router = useRouter()
const homeStore = useHomeStore()
const mangaDiscoverStore = useMangaDiscoverStore()

// 加载状态
const loading = computed(() => {
    if (activeTab.value === 'home') return homeStore.isLoading
    if (activeTab.value === 'newest') return homeStore.isNewestLoading
    if (activeTab.value === 'discover') return mangaDiscoverStore.isLoading
    return false
})

const activeTab = ref(homeStore.activeTab)
const lastUpdateTime = computed(() => {
    if (activeTab.value === 'home') return homeStore.lastUpdateTime
    if (activeTab.value === 'newest') return homeStore.lastNewestUpdateTime
    if (activeTab.value === 'discover') return mangaDiscoverStore.lastListUpdateTime
    return null
})

// 刷新当前激活tab的数据
const refreshCurrentData = () => {
    if (activeTab.value === 'home') {
        homeStore.fetchHomeData(true)
    } else if (activeTab.value === 'newest') {
        homeStore.fetchNewestData(true)
    } else if (activeTab.value === 'discover') {
        mangaDiscoverStore.fetchFilterTags(true)
        mangaDiscoverStore.fetchMangaList(true)
    }
}

// 处理Tab切换
const handleTabChange = (key) => {
    activeTab.value = key
    homeStore.activeTab = key

    if (key === 'home' && !homeStore.hasCache) {
        homeStore.fetchHomeData()
    } else if (key === 'newest' && !homeStore.hasNewestCache) {
        homeStore.fetchNewestData()
    } else if (key === 'discover') {
        // 检查缓存状态，决定是否需要重新加载数据
        if (!mangaDiscoverStore.hasCache || mangaDiscoverStore.isListCacheExpired) {
            mangaDiscoverStore.fetchMangaList()
        }

        if (!mangaDiscoverStore.hasTagsCache || mangaDiscoverStore.isTagsCacheExpired) {
            mangaDiscoverStore.fetchFilterTags()
        }
    }
}

// 监听activeTab变化
watch(activeTab, (newValue) => {
    homeStore.activeTab = newValue
})

onMounted(() => {
    // 根据store中保存的activeTab设置当前tab
    activeTab.value = homeStore.activeTab

    // 加载当前tab的数据
    if (activeTab.value === 'home' && !homeStore.hasCache) {
        homeStore.fetchHomeData()
    } else if (activeTab.value === 'newest' && !homeStore.hasNewestCache) {
        homeStore.fetchNewestData()
    } else if (activeTab.value === 'discover') {
        // 检查缓存状态，决定是否需要重新加载数据
        if (!mangaDiscoverStore.hasCache || mangaDiscoverStore.isListCacheExpired) {
            mangaDiscoverStore.fetchMangaList()
        }

        if (!mangaDiscoverStore.hasTagsCache || mangaDiscoverStore.isTagsCacheExpired) {
            mangaDiscoverStore.fetchFilterTags()
        }
    }
})
</script>

<style src="../assets/styles/home.scss" scoped></style>