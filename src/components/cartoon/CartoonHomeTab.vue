<template>
  <div class="cartoon-home-tab">
    <!-- 筛选区域 -->
    <div class="filters-section">
      <div class="filter-group">
        <div class="filter-label">排序方式</div>
        <div class="filter-buttons">
          <a-button :type="ordering === '-datetime_updated' ? 'primary' : 'default'" size="small"
            @click="changeOrdering('-datetime_updated')">
            最新更新
          </a-button>
          <a-button :type="ordering === '-popular' ? 'primary' : 'default'" size="small"
            @click="changeOrdering('-popular')">
            人气排序
          </a-button>
        </div>
        <div class="filter-actions">
          <a-button type="primary" @click="refreshCartoons" :icon="h(ReloadOutlined)" :loading="loading" size="small">
            刷新
          </a-button>
          <div v-if="lastUpdateTime" class="update-info">
            <a-typography-text type="secondary" style="font-size: 12px">
              最后更新：{{ formatDate(lastUpdateTime) }}
            </a-typography-text>
          </div>
        </div>
      </div>
      <div class="filter-group">
        <div class="filter-label">主题分类</div>
        <div class="filter-buttons">
          <a-button :type="selectedTheme === '' ? 'primary' : 'default'" size="small" @click="handleThemeChange('')">
            全部主题
          </a-button>
          <a-button v-for="theme in themes" :key="theme.path_word"
            :type="selectedTheme === theme.path_word ? 'primary' : 'default'" size="small"
            @click="handleThemeChange(theme.path_word)">
            {{ theme.name }} ({{ theme.count }})
          </a-button>
        </div>
      </div>
    </div>
    <!-- 动画列表 -->
    <div class="cartoon-content">
      <!-- 骨架加载 -->
      <div v-if="loading && !cartoons.length" class="cartoon-grid">
        <div v-for="i in 18" :key="`skeleton-${i}`" class="cartoon-card">
          <a-skeleton active>
            <template #skeleton>
              <div class="skeleton-cover">
                <a-skeleton-image style="width: 100%; height: 100%; border-radius: 8px" />
              </div>
              <div class="skeleton-info">
                <a-skeleton-input style="width: 80%; margin-bottom: 8px" size="small" />
                <a-skeleton-input style="width: 60%; margin-bottom: 8px" size="small" />
                <div style="display: flex; gap: 4px">
                  <a-skeleton-button size="small" style="width: 40px; height: 20px" />
                  <a-skeleton-button size="small" style="width: 36px; height: 20px" />
                </div>
              </div>
            </template>
          </a-skeleton>
        </div>
      </div>

      <!-- 实际数据 -->
      <div v-else-if="cartoons.length" class="cartoon-grid">
        <div v-for="cartoon in cartoons" :key="cartoon.path_word" class="cartoon-card"
          @click="goToDetail(cartoon.path_word)">
          <div class="cartoon-cover">
            <a-image :src="cartoon.cover" :alt="cartoon.name" :preview="false"
              style="width: 100%; height: 100%; object-fit: cover" />
            <div class="cartoon-count">{{ cartoon.count }}集</div>
          </div>
          <div class="cartoon-info">
            <h4 class="cartoon-title" :title="cartoon.name">{{ cartoon.name }}</h4>
            <div class="cartoon-meta">
              <span class="cartoon-date">{{ formatDate(cartoon.datetime_updated) }}</span>
              <span class="cartoon-popular">{{ formatNumber(cartoon.popular) }}</span>
            </div>
            <div class="cartoon-themes" v-if="cartoon.theme && cartoon.theme.length">
              <a-tag v-for="theme in cartoon.theme.slice(0, 3)" :key="theme.name" size="small">
                {{ theme.name }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty v-else description="暂无动画数据" />
    </div>
    <!-- 加载更多 -->
    <LoadMoreButton v-if="cartoons.length > 0" :has-more="hasMore" :loading="loadingMore" @load-more="loadMore" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useCartoonStore } from '@/stores/cartoon.js'
import { formatDate } from '@/utils/date.js'
import { formatNumber } from '@/utils/number.js'
import LoadMoreButton from '@/components/common/LoadMoreButton.vue'
import { ReloadOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const cartoonStore = useCartoonStore()

const ordering = ref('-datetime_updated')
const selectedTheme = ref('')
const limit = ref(18)

// 使用 store 的状态
const loading = computed(() => cartoonStore.isLoading)
const loadingMore = computed(() => cartoonStore.isLoadingMore)
const themes = computed(() => cartoonStore.themes)
const cartoons = computed(
  () => cartoonStore.getCartoonList(ordering.value, selectedTheme.value).list,
)
const total = computed(() => cartoonStore.getCartoonList(ordering.value, selectedTheme.value).total)
const hasMore = computed(
  () => cartoonStore.getCartoonList(ordering.value, selectedTheme.value).hasMore,
)
const lastUpdateTime = computed(() => {
  const data = cartoonStore.getCartoonList(ordering.value, selectedTheme.value)
  return data.lastUpdateTime ? new Date(data.lastUpdateTime).toISOString() : null
})

// 获取动画主题列表
const loadThemes = async (forceRefresh = false) => {
  const result = await cartoonStore.fetchCartoonThemes(forceRefresh)

  if (!result.success) {
    message.error('获取动画主题失败')
  }
}

// 加载动画列表
const loadCartoons = async (isLoadMore = false, forceRefresh = false) => {
  const offset = isLoadMore ? cartoons.value.length : 0

  const result = await cartoonStore.fetchCartoonHome(
    ordering.value,
    limit.value,
    offset,
    selectedTheme.value,
    forceRefresh,
  )

  if (result.success && !result.fromCache && forceRefresh) {
    message.success('动画列表已刷新')
  }

  if (!result.success) {
    message.error('获取动画列表失败')
  }
}

const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return
  loadCartoons(true, false)
}

const refreshCartoons = async () => {
  // 清除缓存并重新加载
  const cacheKey = `${ordering.value}_${selectedTheme.value}`
  cartoonStore.clearCache(cacheKey)
  cartoonStore.clearThemeCache()
  await loadThemes(true)
  await loadCartoons(false, true)
}

const changeOrdering = (newOrdering) => {
  ordering.value = newOrdering
}

const handleThemeChange = (themePathWord) => {
  selectedTheme.value = themePathWord
}

const goToDetail = (pathWord) => {
  router.push(`/cartoon/${pathWord}`)
}

// 监听排序方式和主题变化
watch([ordering, selectedTheme], () => {
  loadCartoons(false, false)
})

onMounted(async () => {
  await loadThemes()
  await loadCartoons(false, false)
})
</script>

<style lang="scss" src="../../assets/styles/cartoon-home-tab.scss" scoped></style>
