<template>
  <div class="manga-discover-container">
    <div class="filters-section">
      <div class="filter-group">
        <div class="filter-label">排序方式</div>
        <div class="filter-buttons">
          <a-button
            :type="currentFilter.ordering === '-popular' ? 'primary' : 'default'"
            size="small"
            @click="changeOrdering('-popular')"
          >
            热度排序
          </a-button>
          <a-button
            :type="currentFilter.ordering === '-datetime_updated' ? 'primary' : 'default'"
            size="small"
            @click="changeOrdering('-datetime_updated')"
          >
            更新时间
          </a-button>
        </div>
        <div class="filter-actions">
          <a-button
            type="primary"
            @click="refreshData"
            :icon="h(ReloadOutlined)"
            :loading="loading"
            size="small"
          >
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
        <div class="filter-label">地区</div>
        <div class="filter-buttons">
          <a-button
            :type="currentFilter.top === '' ? 'primary' : 'default'"
            size="small"
            @click="changeTop('')"
          >
            全部地区
          </a-button>
          <a-button
            v-for="top in filterTags.top"
            :key="top.path_word"
            :type="currentFilter.top === top.path_word ? 'primary' : 'default'"
            size="small"
            @click="changeTop(top.path_word)"
          >
            {{ top.name }}
          </a-button>
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-label">主题分类</div>
        <div class="filter-buttons">
          <a-button
            :type="currentFilter.theme === '' ? 'primary' : 'default'"
            size="small"
            @click="changeTheme('')"
          >
            全部主题
          </a-button>
          <a-button
            v-for="theme in filterTags.theme"
            :key="theme.path_word"
            :type="currentFilter.theme === theme.path_word ? 'primary' : 'default'"
            size="small"
            @click="changeTheme(theme.path_word)"
          >
            {{ theme.name }} ({{ theme.count }})
          </a-button>
        </div>
      </div>
    </div>

    <a-skeleton
      active
      v-if="loading && mangaList.length === 0"
      :paragraph="{ rows: 10 }"
      :loading="loading"
    />

    <div class="manga-grid" v-else>
      <div
        v-for="manga in mangaList"
        :key="manga.path_word"
        class="manga-card"
        @click="goToMangaDetail(manga)"
      >
        <div class="manga-cover">
          <img :src="manga.cover" :alt="manga.name" />
          <div class="manga-status" :class="{ completed: manga.status === 1 }">
            {{ manga.status === 1 ? '已完结' : '连载中' }}
          </div>
        </div>
        <div class="manga-info">
          <h3 class="manga-title">{{ manga.name }}</h3>
          <p class="manga-author">{{ getAuthors(manga.author) }}</p>
          <p class="manga-date">更新: {{ formatDate(manga.datetime_updated) }}</p>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more-container" @mouseenter="loadMore">
      <div class="load-more-text" :class="{ loading: loading }">
        {{ loading ? '加载中...' : '加载更多' }}
      </div>
    </div>
    <div v-else-if="mangaList.length > 0" class="load-more-container">
      <div class="load-more-text no-more">没有更多了</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMangaDiscoverStore } from '@/stores/manga-discover'
import { useMangaStore } from '@/stores/manga'
import { message } from 'ant-design-vue'
import { formatDate } from '@/utils/date'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { useMangaNavigation } from '@/composables/useMangaNavigation'

const router = useRouter()
const mangaDiscoverStore = useMangaDiscoverStore()
useMangaStore()
const { goToMangaDetail } = useMangaNavigation()

// 数据绑定
const mangaList = computed(() => mangaDiscoverStore.mangaList)
const filterTags = computed(() => mangaDiscoverStore.filterTags)
const currentFilter = computed(() => mangaDiscoverStore.currentFilter)
const loading = computed(() => mangaDiscoverStore.isLoading)
const hasMore = computed(() => mangaDiscoverStore.hasMore)
const lastUpdateTime = ref(mangaDiscoverStore.lastListUpdateTime)

// 初始化数据
const initData = async () => {
  // 先获取过滤标签
  const tagsResult = await mangaDiscoverStore.fetchFilterTags()
  if (!tagsResult.success) {
    message.error('获取过滤标签失败，请检查网络连接')
  }

  // 获取漫画列表
  const listResult = await mangaDiscoverStore.fetchMangaList()
  if (listResult.success) {
    if (!listResult.fromCache) {
      lastUpdateTime.value = Date.now()
    }
  } else {
    message.error('获取漫画列表失败，请检查网络连接')
  }
}

// 刷新数据
const refreshData = async () => {
  // 强制刷新标签和列表
  await mangaDiscoverStore.fetchFilterTags(true)
  const listResult = await mangaDiscoverStore.fetchMangaList(true)

  if (listResult.success && !listResult.fromCache) {
    lastUpdateTime.value = Date.now()
    message.success('刷新成功')
  } else if (!listResult.success) {
    message.error('刷新失败，请检查网络连接')
  }
}

// 更改排序方式
const changeOrdering = (ordering) => {
  if (currentFilter.value.ordering === ordering) return
  mangaDiscoverStore.updateFilter({ ordering })
}

// 更改主题
const changeTheme = (theme) => {
  if (currentFilter.value.theme === theme) return
  mangaDiscoverStore.updateFilter({ theme })
}

// 更改地区
const changeTop = (top) => {
  if (currentFilter.value.top === top) return
  mangaDiscoverStore.updateFilter({ top })
}

// 加载更多
const loadMore = () => {
  if (!loading.value && hasMore.value) {
    mangaDiscoverStore.loadMore()
  }
}

// 获取作者列表
const getAuthors = (authors) => {
  if (!authors || !authors.length) return '未知作者'
  return authors.map((author) => author.name).join(', ')
}

onMounted(() => {
  initData()
})
</script>

<style src="../assets/styles/manga-discover.scss" lang="scss" scoped></style>
