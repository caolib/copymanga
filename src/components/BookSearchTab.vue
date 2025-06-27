<template>
  <div class="book-search-tab">
    <!-- 搜索区域 -->
    <div class="search-section">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="请输入轻小说名称..."
        size="large"
        enter-button=""
        :loading="loading"
        @search="handleSearch"
        @pressEnter="handleSearch"
        class="search-input"
      />

      <!-- 搜索类型选择 -->
      <div class="search-filters" v-if="searchKeyword">
        <div class="filter-group">
          <span class="filter-label">搜索类型：</span>
          <a-radio-group v-model:value="searchType" @change="handleSearch" size="small">
            <a-radio-button value="">全部</a-radio-button>
            <a-radio-button value="name">名称</a-radio-button>
            <a-radio-button value="author">作者</a-radio-button>
          </a-radio-group>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-content">
      <!-- 骨架加载 -->
      <div v-if="loading && !books.length" class="book-grid">
        <div v-for="i in 12" :key="`skeleton-${i}`" class="book-card">
          <a-skeleton active>
            <template #skeleton>
              <div class="skeleton-cover">
                <a-skeleton-image style="width: 100%; height: 100%; border-radius: 8px" />
              </div>
              <div class="skeleton-info">
                <a-skeleton-input style="width: 80%; margin: 8px" size="small" />
                <a-skeleton-input style="width: 60%; margin: 8px" size="small" />
              </div>
            </template>
          </a-skeleton>
        </div>
      </div>

      <!-- 实际搜索结果 -->
      <div v-else-if="books.length" class="book-grid">
        <div
          v-for="book in books"
          :key="book.path_word"
          class="book-card"
          @click="goToDetail(book.path_word)"
        >
          <div class="book-cover">
            <a-image
              :src="book.cover"
              :alt="book.name"
              :preview="false"
              style="width: 100%; height: 100%; object-fit: cover"
            />
          </div>
          <div class="book-info">
            <h4 class="book-title" :title="book.name">{{ book.name }}</h4>
            <div class="book-meta">
              <span class="book-author">{{ getAuthors(book.author) }}</span>
              <span class="book-popular">{{ formatNumber(book.popular) }}人气</span>
            </div>
            <div class="book-alias" v-if="book.alias" :title="book.alias">
              {{ book.alias }}
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && hasSearched" class="empty-state">
        <a-empty description="没有找到相关轻小说" />
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <a-empty description="请输入关键词搜索轻小说" />
      </div>
    </div>

    <!-- 加载更多 -->
    <div class="load-more" v-if="books.length && hasMore">
      <a-button @click="loadMore" :loading="loadingMore" type="default" block> 加载更多 </a-button>
    </div>

    <!-- 无更多数据提示 -->
    <div class="no-more" v-if="books.length && !hasMore && hasSearched">
      <a-divider>已加载全部搜索结果</a-divider>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { searchBooks } from '@/api/book'
import { formatNumber } from '@/utils/number'

const router = useRouter()

const searchKeyword = ref('')
const searchType = ref('')
const books = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const hasSearched = ref(false)
const limit = ref(18)
const offset = ref(0)

const hasMore = computed(() => books.value.length < total.value)

const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入搜索关键词')
    return
  }

  books.value = []
  offset.value = 0
  loadBooks()
}

const loadBooks = () => {
  loading.value = true
  hasSearched.value = true

  searchBooks(searchKeyword.value.trim(), limit.value, offset.value, searchType.value)
    .then((response) => {
      if (response.code === 200 && response.results) {
        const data = response.results
        if (offset.value === 0) {
          books.value = data.list || []
        } else {
          books.value.push(...(data.list || []))
        }
        total.value = data.total || 0
        offset.value += limit.value

        if (offset.value === limit.value && books.value.length === 0) {
          message.info('没有找到相关轻小说')
        }
      } else {
        throw new Error(response.message || '搜索失败')
      }
    })
    .catch((err) => {
      console.error('搜索轻小说失败:', err)
      message.error('搜索失败，请稍后重试')
    })
    .finally(() => {
      loading.value = false
    })
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  searchBooks(searchKeyword.value.trim(), limit.value, offset.value, searchType.value)
    .then((response) => {
      if (response.code === 200 && response.results) {
        const data = response.results
        books.value.push(...(data.list || []))
        offset.value += limit.value
      } else {
        throw new Error(response.message || '加载失败')
      }
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
  router.push(`/book/${pathWord}`)
}

const getAuthors = (authors) => {
  if (!authors || !authors.length) return '未知作者'
  return authors.map((author) => author.name).join(', ')
}
</script>

<style scoped src="../assets/styles/book-search-tab.scss" lang="scss"></style>
