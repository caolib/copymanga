<template>
    <h3>
        {{ authorName }} 的作品
    </h3>
    <a-card class="author-manga-list-container" :bordered="false">
        <a-skeleton :loading="loading" active>
            <a-row :gutter="[16, 16]">
                <a-col v-for="manga in mangaList" :key="manga.path_word" :xs="12" :sm="12" :md="6" :lg="6" :xl="6"
                    :xxl="6">
                    <a-card hoverable @click="goToMangaDetail(manga.path_word)" class="manga-card">
                        <template #cover>
                            <img :src="manga.cover" :alt="manga.name" class="manga-cover" />
                        </template>
                        <a-card-meta>
                            <template #title>
                                <a-tooltip :title="manga.name">
                                    <div class="manga-title">{{ manga.name }}</div>
                                </a-tooltip>
                            </template>
                            <template #description>
                                <div class="manga-meta">
                                    <div class="popular">
                                        <a-typography-text type="secondary">
                                            人气: {{ formatPopular(manga.popular) }}
                                        </a-typography-text>
                                    </div>
                                    <div class="update-time">
                                        <a-typography-text type="secondary">
                                            {{ manga.datetime_updated }}
                                        </a-typography-text>
                                    </div>
                                </div>
                            </template>
                        </a-card-meta>
                    </a-card>
                </a-col>
            </a-row>

            <div v-if="total > 12" class="pagination-container">
                <a-pagination v-model:current="currentPage" :total="total" :page-size="pageSize"
                    :show-size-changer="false" :show-quick-jumper="true"
                    :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`"
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

    await getAuthorMangaList(
        authorPathWord.value,
        pageSize,
        offset
    ).then(response => {
        if (response?.results) {
            mangaList.value = response.results.list || []
            total.value = response.results.total || 0
        }
    }).catch(err => {
        console.error('获取作者作品失败:', err)
        message.error('获取作者作品失败')
    }).finally(() => {
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
