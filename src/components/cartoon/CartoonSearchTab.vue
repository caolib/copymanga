<template>
  <div class="cartoon-search-tab">
    <!-- 搜索区域 -->
    <div class="search-section">
      <a-input-search v-model:value="searchKeyword" placeholder="请输入动画名称..." size="large" enter-button
        :loading="loading" @search="handleSearch" @pressEnter="handleSearch" class="search-input" />
    </div>

    <!-- 搜索结果 -->
    <div class="search-content">
      <!-- 骨架加载 -->
      <div v-if="loading && !cartoons.length" class="cartoon-grid">
        <div v-for="i in 18" :key="`skeleton-${i}`" class="cartoon-card">
          <a-skeleton active>
            <template #skeleton>
              <div class="skeleton-cover">
                <a-skeleton-image style="width: 100%; height: 100%; border-radius: 8px" />
              </div>
              <div class="skeleton-info">
                <a-skeleton-input style="width: 80%; margin: 8px" size="small" />
                <a-skeleton-input style="width: 60%; margin: 8px" size="small" />
                <div style="display: flex; gap: 4px">
                  <a-skeleton-button size="small" style="width: 40px; height: 20px" />
                  <a-skeleton-button size="small" style="width: 36px; height: 20px" />
                </div>
              </div>
            </template>
          </a-skeleton>
        </div>
      </div>

      <!-- 实际搜索结果 -->
      <div v-else-if="cartoons.length" class="cartoon-grid">
        <div v-for="cartoon in cartoons" :key="cartoon.path_word" class="cartoon-card"
          @click="goToDetail(cartoon.path_word)">
          <div class="cartoon-cover">
            <a-image :src="cartoon.cover" :alt="cartoon.name" :preview="false"
              style="width: 100%; height: 100%; object-fit: cover" />
            <div class="cartoon-year" v-if="cartoon.pub_year">{{ cartoon.pub_year }}年</div>
          </div>
          <div class="cartoon-info">
            <h4 class="cartoon-title" :title="cartoon.name">{{ cartoon.name }}</h4>
            <div class="cartoon-meta">
              <span class="cartoon-company" v-if="cartoon.company">{{ cartoon.company.name }}</span>
              <span class="cartoon-popular">{{ formatNumber(cartoon.popular) }}人气</span>
            </div>
            <div class="cartoon-alias" v-if="cartoon.alias" :title="cartoon.alias">
              {{ cartoon.alias }}
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && hasSearched" class="empty-state">
        <a-empty description="没有找到相关动画" />
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <a-empty description="请输入关键词搜索动画" />
      </div>
    </div>

    <!-- 加载更多 -->
    <div class="load-more" v-if="cartoons.length && hasMore">
      <a-button @mouseenter="loadMore" :loading="loadingMore" type="default" block> 加载更多 </a-button>
    </div>

    <!-- 无更多数据提示 -->
    <div class="no-more" v-if="cartoons.length && !hasMore && hasSearched">
      <a-divider>已加载全部搜索结果</a-divider>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { searchCartoon } from '@/api/cartoon.js'
import { formatNumber } from '@/utils/number.js'

const router = useRouter()

const searchKeyword = ref('')
const cartoons = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const hasSearched = ref(false)
const limit = ref(18)
const offset = ref(0)

const hasMore = computed(() => cartoons.value.length < total.value)

const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  cartoons.value = []
  offset.value = 0
  loadCartoons()
}

const loadCartoons = () => {
  loading.value = true
  hasSearched.value = true

  searchCartoon(searchKeyword.value.trim(), limit.value, offset.value)
    .then((response) => {
      const data = response.results

      if (offset.value === 0) {
        cartoons.value = data.list || []
      } else {
        cartoons.value.push(...(data.list || []))
      }

      total.value = data.total || 0
      offset.value += limit.value

      if (offset.value === limit.value && cartoons.value.length === 0) {
        message.info('没有找到相关动画')
      }
    })
    .catch((err) => {
      console.error('搜索动画失败:', err)
      message.error('搜索失败，请稍后重试')
    })
    .finally(() => {
      loading.value = false
    })
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true

  searchCartoon(searchKeyword.value.trim(), limit.value, offset.value)
    .then((response) => {
      const data = response.results
      cartoons.value.push(...(data.list || []))
      offset.value += limit.value
    })
    .catch((err) => {
      console.error('加载更多失败:', err)
      message.error('加载失败，请稍后重试')
    })
    .finally(() => {
      loadingMore.value = false
    })
}

const goToDetail = (pathWord) => {
  router.push(`/cartoon/${pathWord}`)
}
</script>

<style scoped src="../../assets/styles/cartoon-search-tab.scss" lang="scss"></style>
