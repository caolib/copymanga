<template>
  <h3>{{ authorName }} 的作品</h3>
  <a-card class="author-manga-list-container" :bordered="false">
    <a-skeleton :loading="loading" active>
      <a-row :gutter="[16, 16]">
        <a-col v-for="manga in mangaList" :key="manga.path_word" :xs="12" :sm="8" :md="6" :lg="4">
          <MangaCard :manga="manga" display-type="grid" :use-card-cover="true"
            @click="goToMangaDetail(manga.path_word)" />
        </a-col>
      </a-row>

      <div v-if="total > 12" class="pagination-container">
        <a-pagination v-model:current="currentPage" :total="total" :page-size="pageSize" :show-size-changer="false"
          :show-quick-jumper="true" :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`"
          @change="handlePageChange" />
      </div>

      <a-empty v-if="!loading && mangaList.length === 0" description="暂无作品" />
    </a-skeleton>
  </a-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAuthorMangaList } from '../api/manga'
import { formatNumber } from '@/utils/number'
import MangaCard from '@/components/manga/MangaCard.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const mangaList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 12

const authorPathWord = computed(() => route.params.authorPathWord)
const authorName = computed(() => route.query.name || '')

const loadMangaList = async (page = 1) => {
  loading.value = true

  const offset = (page - 1) * pageSize

  await getAuthorMangaList(authorPathWord.value, pageSize, offset)
    .then((response) => {
      if (response?.results) {
        mangaList.value = response.results.list || []
        total.value = response.results.total || 0
      }
    })
    .catch((err) => {
      console.error('获取作者作品失败:', err)
      message.error('获取作者作品失败')
    })
    .finally(() => {
      loading.value = false
    })
}

const handlePageChange = (page) => {
  currentPage.value = page
  loadMangaList(page)
}

const goToMangaDetail = (pathWord) => {
  router.push(`/manga/${pathWord}`)
}

onMounted(() => {
  loadMangaList()
  console.log('authorName:', authorName.value)
})
</script>

<style scoped src="../assets/styles/author-manga-list.scss" lang="scss"></style>
