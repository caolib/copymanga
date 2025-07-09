<template>
  <!-- 全新上架标签页内容 -->
  <div>
    <!-- 全新上架漫画列表 -->
    <a-row :gutter="16">
      <a-col class="manga-col" v-for="item in newestData.list || []" :key="item.comic.path_word" :xs="12" :sm="8"
        :md="6" :lg="4">
        <MangaCard :manga="item.comic" :item="item" click-type="online" :show-popular="true" :show-chapter="true"
          :chapter-text="`最新: ${item.name}`" :date-text="formatDate(item.datetime_created)" />
      </a-col>
    </a-row>

    <!-- 加载更多区域 -->
    <LoadMoreButton v-if="newestData.list && newestData.list.length > 0"
      :has-more="!(newestData.offset + newestData.limit >= newestData.total)" :loading="homeStore.isNewestLoading"
      @load-more="loadMoreNewest" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHomeStore } from '@/stores/home.js'
import LoadMoreButton from '@/components/common/LoadMoreButton.vue'
import MangaCard from '@/components/manga/MangaCard.vue'
import { useMangaNavigation } from '@/composables/useMangaNavigation'
import { formatDate } from '@/utils/date'

const homeStore = useHomeStore()
const { goToMangaDetail } = useMangaNavigation()

// 数据
const newestData = computed(() => homeStore.newestData)

// 加载更多最新漫画
const loadMoreNewest = () => {
  if (homeStore.isNewestLoading) return

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
}
</script>

<style src="../../assets/styles/home.scss" scoped></style>
