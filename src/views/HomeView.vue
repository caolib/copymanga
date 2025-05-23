<template>
    <div class="home">
        <a-row>
            <a-col :span="24">
                <a-card>
                    <a-space direction="vertical" size="large" style="width:100%">
                        <!-- 搜索区 -->
                        <a-input-search v-model:value="searchKeyword" placeholder="输入漫画名进行搜索" enter-button="搜索"
                            size="large" @search="onSearch"
                            style="max-width: 400px; margin: 32px auto 0; display: block;" />
                        <a-spin :spinning="searchLoading" style="width:100%">
                            <div v-if="searchResults.length > 0" class="search-grid">
                                <a-row :gutter="24">
                                    <a-col v-for="item in searchResults" :key="item.path_word" :xs="24" :sm="12" :md="8"
                                        :lg="6">
                                        <a-card hoverable class="manga-search-card" @click="goToDetail(item)">
                                            <img :src="item.cover" :alt="item.name" class="manga-search-cover" />
                                            <div class="manga-search-title">{{ item.name }}</div>
                                            <div class="manga-search-author" v-if="item.author && item.author.length">
                                                作者: {{item.author.map(a => a.name).join(', ')}}
                                            </div>
                                            <div class="manga-search-popular">人气: {{ item.popular }}</div>
                                        </a-card>
                                    </a-col>
                                </a-row>
                            </div>
                            <a-pagination v-if="searchTotal > searchPageSize" :current="searchPage"
                                :page-size="searchPageSize" :total="searchTotal" show-size-changer
                                :page-size-options="['12', '24', '36', '48']" @change="onPageChange"
                                @showSizeChange="onPageSizeChange" style="margin: 16px 0; text-align: center;" />
                            <a-empty v-else-if="searchSearched && !searchLoading && searchResults.length === 0"
                                description="暂无搜索结果" style="margin-top: 16px;" />
                        </a-spin>
                    </a-space>
                </a-card>
            </a-col>
        </a-row>
    </div>
</template>

<script setup>
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'
import { searchManga } from '../api/manga'
import { useMangaStore } from '../stores/manga'

const router = useRouter()
const mangaStore = useMangaStore()
const searchKeyword = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchSearched = ref(false)
const searchPage = ref(1)
const searchPageSize = ref(12)
const searchTotal = ref(0)

const fetchSearch = () => {
    if (!searchKeyword.value.trim()) return
    searchLoading.value = true
    searchSearched.value = true
    searchManga(searchKeyword.value, searchPageSize.value, (searchPage.value - 1) * searchPageSize.value)
        .then(res => {
            if (res && res.code === 200 && res.results && res.results.list) {
                searchResults.value = res.results.list
                searchTotal.value = res.results.total || 0
            } else {
                searchResults.value = []
                searchTotal.value = 0
            }
        })
        .catch(() => {
            searchResults.value = []
            searchTotal.value = 0
        })
        .finally(() => {
            searchLoading.value = false
        })
}

const onSearch = () => {
    searchPage.value = 1
    fetchSearch()
}

const onPageChange = (page, pageSize) => {
    searchPage.value = page
    searchPageSize.value = pageSize
    fetchSearch()
}

const onPageSizeChange = (current, size) => {
    searchPage.value = 1
    searchPageSize.value = size
    fetchSearch()
}

const goToDetail = (item) => {
    mangaStore.setCurrentManga(item)
    router.push(`/manga/${item.path_word}`)
}
</script>

<style scoped>
.home {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.search-grid {
    margin-top: 24px;
}

.manga-search-card {
    margin-bottom: 24px;
    cursor: pointer;
    transition: box-shadow 0.2s;
    border-radius: 8px;
    overflow: hidden;
    text-align: center;
}

.manga-search-card:hover {
    box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
}

.manga-search-cover {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 8px 8px 0 0;
}

.manga-search-title {
    font-size: 16px;
    font-weight: bold;
    margin: 12px 0 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.manga-search-author {
    font-size: 13px;
    color: #888;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.manga-search-popular {
    font-size: 12px;
    color: #aaa;
    margin-bottom: 8px;
}
</style>