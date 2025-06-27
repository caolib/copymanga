<template>
  <!-- 全新上架标签页内容 -->
  <div>
    <!-- 全新上架漫画列表 -->
    <a-row :gutter="16">
      <a-col
        class="manga-col"
        v-for="item in newestData.list || []"
        :key="item.comic.path_word"
        :xs="12"
        :sm="8"
        :md="6"
        :lg="4"
      >
        <a-card hoverable class="manga-card" @click="goToMangaDetail(item.comic)">
          <img :src="item.comic.cover" :alt="item.comic.name" class="manga-cover" />
          <div class="manga-title">{{ item.comic.name }}</div>
          <div class="manga-meta">
            <div class="manga-popular">人气: {{ item.comic.popular }}</div>
            <div class="manga-date">{{ formatDate(item.datetime_created) }}</div>
          </div>
          <div class="manga-chapter">最新: {{ item.name }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 加载更多区域 -->
    <div
      v-if="
        newestData.list &&
        newestData.list.length > 0 &&
        !(newestData.offset + newestData.limit >= newestData.total)
      "
      class="load-more-container"
      @mouseenter="loadMoreNewest"
    >
      <div class="load-more-text" :class="{ loading: homeStore.isNewestLoading }">
        {{ homeStore.isNewestLoading ? '加载中...' : '加载更多' }}
      </div>
    </div>
    <div v-else-if="newestData.list && newestData.list.length > 0" class="load-more-container">
      <div class="load-more-text no-more">没有更多了</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHomeStore } from '@/stores/home.js'
import { useMangaNavigation } from '@/composables/useMangaNavigation.js'
import { formatDate } from '@/utils/date.js'

const homeStore = useHomeStore()
const { goToMangaDetail } = useMangaNavigation()

// 数据
const newestData = computed(() => homeStore.newestData)

// 加载更多最新漫画（添加防抖）
let loadMoreTimer = null
const loadMoreNewest = () => {
  if (homeStore.isNewestLoading) return

  // 清除之前的定时器
  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer)
  }

  // 设置新的定时器，300ms后执行加载
  loadMoreTimer = setTimeout(() => {
    const offset = newestData.value.offset + newestData.value.limit
    homeStore.isNewestLoading = true

    import('../../api/manga').then(({ getNewestManga }) => {
      getNewestManga('', newestData.value.limit, offset)
        .then((res) => {
          if (res && res.code === 200 && res.results) {
            // 合并新数据到现有数据
            homeStore.newestData = {
              ...res.results,
              list: [...(homeStore.newestData.list || []), ...(res.results.list || [])],
            }
          }
        })
        .catch((error) => {
          console.error('加载更多最新漫画失败:', error)
        })
        .finally(() => {
          homeStore.isNewestLoading = false
        })
    })
  }, 300)
}
</script>

<style src="../../assets/styles/home.scss" scoped></style>
