<template>
  <div class="ranking-tab">
    <!-- 过滤器 -->
    <div class="filters-section">
      <div class="filter-group">
        <div class="filter-buttons">
          <a-button :type="contentType === 1 ? 'primary' : 'default'" size="small" @click="handleContentTypeChange(1)">
            漫画
          </a-button>
          <a-button :type="contentType === 5 ? 'primary' : 'default'" size="small" @click="handleContentTypeChange(5)">
            轻小说
          </a-button>
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-buttons">
          <a-button :type="dateType === 'day' ? 'primary' : 'default'" size="small"
            @click="handleDateTypeChange('day')">
            日榜
          </a-button>
          <a-button :type="dateType === 'week' ? 'primary' : 'default'" size="small"
            @click="handleDateTypeChange('week')">
            周榜
          </a-button>
          <a-button :type="dateType === 'month' ? 'primary' : 'default'" size="small"
            @click="handleDateTypeChange('month')">
            月榜
          </a-button>
          <a-button :type="dateType === 'total' ? 'primary' : 'default'" size="small"
            @click="handleDateTypeChange('total')">
            总榜
          </a-button>
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-buttons">
          <a-button :type="audienceType === '' ? 'primary' : 'default'" size="small"
            @click="handleAudienceTypeChange('')">
            全部
          </a-button>
          <a-button :type="audienceType === 'male' ? 'primary' : 'default'" size="small"
            @click="handleAudienceTypeChange('male')">
            男频
          </a-button>
          <a-button :type="audienceType === 'female' ? 'primary' : 'default'" size="small"
            @click="handleAudienceTypeChange('female')">
            女频
          </a-button>
        </div>
      </div>
    </div>

    <!-- 列表加载中 -->
    <div v-if="isLoading && !rankingList.length" class="loading-container">
      <a-spin tip="加载中..." size="large" />
    </div>

    <!-- 排行榜列表 -->
    <a-spin :spinning="isLoading && rankingList.length === 0">
      <a-row :gutter="16" class="manga-list">
        <a-col class="manga-col" v-for="(item, index) in rankingList" :key="index" :xs="12" :sm="8" :md="6" :lg="4">
          <MangaCard :manga="getMangaWithPopular(item)" :item="item" :ranking="index + 1"
            :trend="getTrendType(item.rise_sort)" :trend-value="getTrendValue(item.rise_sort)" display-type="grid"
            :use-card-cover="true" click-type="custom" :on-click="() => handleItemClick(item)" :natural-size="true" />
        </a-col>
      </a-row>
    </a-spin>

    <!-- 加载更多 -->
    <LoadMoreButton v-if="rankingList.length > 0" :has-more="hasMore" :loading="isLoading" @load-more="loadMore" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMangaRankingStore } from '@/stores/index.js'
import LoadMoreButton from '@/components/common/LoadMoreButton.vue'
import MangaCard from '@/components/manga/MangaCard.vue'

const router = useRouter()
const rankingStore = useMangaRankingStore()

// 状态管理
const contentType = ref(rankingStore.currentType)
const dateType = ref(rankingStore.currentDateType)
const audienceType = ref(rankingStore.currentAudienceType)

// 计算属性
const rankingList = computed(() => rankingStore.rankingList)
const isLoading = computed(() => rankingStore.isLoading)
const hasMore = computed(() => {
  const pagination = rankingStore.pagination
  return pagination.offset + pagination.limit < pagination.total
})

// 处理内容类型切换
const handleContentTypeChange = (type) => {
  contentType.value = type
  rankingStore.setType(type)
}

// 处理时间类型切换
const handleDateTypeChange = (type) => {
  dateType.value = type
  rankingStore.setDateType(type)
}

// 处理受众类型切换
const handleAudienceTypeChange = (type) => {
  audienceType.value = type
  rankingStore.setAudienceType(type)
}

// 加载更多
const loadMore = () => {
  if (!isLoading.value) {
    rankingStore.loadMore()
  }
}

// 处理项目点击，跳转到详情页
const handleItemClick = (item) => {
  if (contentType.value === 1 && item.comic) {
    // 漫画详情页
    router.push({
      name: 'MangaDetail',
      params: { pathWord: item.comic.path_word },
    })
  } else if (contentType.value === 5 && item.book) {
    // 轻小说详情页
    router.push({
      name: 'BookDetail',
      params: { pathWord: item.book.path_word },
    })
  }
}

// 获取趋势类型
const getTrendType = (riseSort) => {
  if (riseSort > 0) return 'up'
  if (riseSort < 0) return 'down'
  return 'same'
}

// 获取趋势变化值
const getTrendValue = (riseSort) => {
  return Math.abs(riseSort || 0)
}

// 获取包含热度信息的漫画数据
const getMangaWithPopular = (item) => {
  const manga = contentType.value === 1 ? item.comic : item.book
  if (!manga) return {}

  // 将热度信息合并到漫画数据中
  return {
    ...manga,
    popular: item.popular || 0
  }
}

// 监听参数变化，确保同步
watch(
  () => rankingStore.currentType,
  (newValue) => {
    contentType.value = newValue
  },
)

watch(
  () => rankingStore.currentDateType,
  (newValue) => {
    dateType.value = newValue
  },
)

watch(
  () => rankingStore.currentAudienceType,
  (newValue) => {
    audienceType.value = newValue
  },
)

// 组件挂载时加载数据
onMounted(() => {
  // 每次打开页面都重新获取最新数据
  rankingStore.fetchRankingData()
})
</script>

<style scoped src="../../assets/styles/manga-ranking.scss" lang="scss"></style>
