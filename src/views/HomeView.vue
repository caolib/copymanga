<template>
  <div class="home">
    <!-- Tab切换 -->
    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <template #rightExtra>
        <a-button v-if="activeTab !== 'ranking' && activeTab !== 'topics'" type="primary" @click="refreshCurrentData"
          :icon="h(ReloadOutlined)" :loading="loading" size="small" style="margin-right: 10px;">
          刷新
        </a-button>
        <a-button type="default" @click="goToHttpTest" size="small" style="margin-right: 10px;">
          HTTP测试
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

      <a-tab-pane key="ranking" tab="排行榜">
        <RankingTabContent />
      </a-tab-pane>

      <a-tab-pane key="topics" tab="专题">
        <TopicsTabContent />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useHomeStore } from '../stores/home'
import { useMangaDiscoverStore } from '@/stores/index.js'
import { useMangaRankingStore } from '@/stores/index.js'
import { useTopicStore } from '../stores/topic'
import { formatDate } from '../utils/date'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { useRouter } from 'vue-router'
import HomeTabContent from '../components/home/HomeTabContent.vue'
import NewestTabContent from '../components/home/NewestTabContent.vue'
import MangaDiscoverTabContent from '../components/home/MangaDiscoverTabContent.vue'
import RankingTabContent from '../components/home/RankingTabContent.vue'
import TopicsTabContent from '../components/home/TopicsTabContent.vue'

const router = useRouter()
const homeStore = useHomeStore()
const mangaDiscoverStore = useMangaDiscoverStore()
const mangaRankingStore = useMangaRankingStore()
useTopicStore();
// 加载状态
const loading = computed(() => {
  if (activeTab.value === 'home') return homeStore.isLoading
  if (activeTab.value === 'newest') return homeStore.isNewestLoading
  if (activeTab.value === 'discover') return mangaDiscoverStore.isLoading
  if (activeTab.value === 'ranking') return mangaRankingStore.isLoading
  if (activeTab.value === 'topics') return homeStore.isLoading
  return false
})

const activeTab = ref(homeStore.activeTab)
const lastUpdateTime = computed(() => {
  if (activeTab.value === 'home') return homeStore.lastUpdateTime
  if (activeTab.value === 'newest') return homeStore.lastNewestUpdateTime
  if (activeTab.value === 'discover') return mangaDiscoverStore.lastListUpdateTime
  return null
})

// 导航到HTTP测试页面
const goToHttpTest = () => {
  router.push('/test/http')
}

// 刷新当前激活tab的数据
const refreshCurrentData = () => {
  if (activeTab.value === 'home') {
    homeStore.fetchHomeData(true)
  } else if (activeTab.value === 'newest') {
    homeStore.fetchNewestData(true)
  } else if (activeTab.value === 'discover') {
    mangaDiscoverStore.fetchFilterTags(true)
    mangaDiscoverStore.fetchMangaList(true)
  } else if (activeTab.value === 'ranking') {
    mangaRankingStore.fetchRankingData()
  } else if (activeTab.value === 'topics') {
    homeStore.fetchHomeData(true)
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
  } else if (key === 'ranking') {
    // 排行榜每次都获取最新数据
    mangaRankingStore.fetchRankingData()
  } else if (key === 'topics' && !homeStore.hasCache) {
    // 专题使用主页数据，如果主页数据未加载，则加载主页数据
    homeStore.fetchHomeData()
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
  } else if (activeTab.value === 'ranking') {
    // 排行榜每次都获取最新数据
    mangaRankingStore.fetchRankingData()
  } else if (activeTab.value === 'topics' && !homeStore.hasCache) {
    // 专题使用主页数据，如果主页数据未加载，则加载主页数据
    homeStore.fetchHomeData()
  }
})
</script>

<style src="../assets/styles/home.scss" scoped></style>