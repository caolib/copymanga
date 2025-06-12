<template>
    <div class="search-container">
        <!-- 搜索区域 -->
        <div class="search-section">
            <div class="search-form">
                <div class="search-input-group">
                    <a-input-search v-model:value="searchKeyword" placeholder="请输入漫画名称、作者或汉化组" enter-button="搜索"
                        size="large" @search="handleSearch" :loading="loading" />
                </div>

                <!-- 筛选条件 -->
                <div class="search-filters" v-if="searchKeyword">
                    <div class="filter-group">
                        <span class="filter-label">搜索类型：</span>
                        <a-radio-group v-model:value="searchType" @change="handleFilterChange" size="small">
                            <a-radio-button value="">全部</a-radio-button>
                            <a-radio-button value="name">名称</a-radio-button>
                            <a-radio-button value="author">作者</a-radio-button>
                            <a-radio-button value="local">汉化组</a-radio-button>
                        </a-radio-group>
                    </div>

                    <div class="search-stats" v-if="hasSearched && !loading">
                        <span>找到 {{ totalCount }} 个结果</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 搜索结果 -->
        <div class="search-results" v-if="searchKeyword">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-state">
                <a-row :gutter="[20, 20]">
                    <a-col v-for="n in 6" :key="n" :xs="12" :sm="8" :md="6" :lg="4" :xl="4">
                        <a-card class="manga-card skeleton-card">
                            <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                                <template #avatar>
                                    <div class="skeleton-cover"></div>
                                </template>
                            </a-skeleton>
                        </a-card>
                    </a-col>
                </a-row>
            </div>

            <!-- 错误状态 -->
            <a-alert v-else-if="error" type="error" :message="error" show-icon style="margin-bottom: 20px" />

            <!-- 空结果 -->
            <a-empty v-else-if="searchResults.length === 0 && hasSearched" description="没有找到相关漫画">
                <template #image>
                    <div style="font-size: 64px;">📚</div>
                </template>
            </a-empty> <!-- 结果列表 -->
            <div v-else class="results-grid">
                <a-row :gutter="[20, 20]">
                    <a-col v-for="manga in validResults" :key="manga.path_word" :xs="12" :sm="8" :md="6" :lg="4" :xl="3"
                        :xxl="3">
                        <a-card hoverable class="manga-card" @click="goToMangaDetail(manga)">
                            <div class="manga-cover">
                                <img :src="manga.cover" :alt="manga.name" @error="handleImageError" />
                                <div class="manga-popular" v-if="manga.popular">
                                    {{ formatPopular(manga.popular) }}
                                </div>
                            </div>
                            <a-card-meta :title="manga.name">
                                <template #description>
                                    <div class="manga-info">
                                        <div class="manga-alias" v-if="manga.alias">
                                            {{ truncateText(manga.alias, 30) }}
                                        </div>
                                        <div class="manga-author" v-if="manga.author && manga.author.length">
                                            {{manga.author.map(a => a.name).join(', ')}}
                                        </div>
                                    </div>
                                </template>
                            </a-card-meta>
                        </a-card>
                    </a-col>
                </a-row>
            </div>

            <!-- 分页 -->
            <div class="pagination-section" v-if="totalCount > pageSize">
                <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="totalCount"
                    :show-size-changer="true" :show-quick-jumper="true"
                    :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`"
                    @change="handlePageChange" @show-size-change="handlePageSizeChange" />
            </div>
        </div>

        <!-- 初始状态 -->
        <div v-else class="initial-state">
            <a-empty description="输入关键词开始搜索漫画">
                <template #image>
                    <div style="font-size: 64px;">🔍</div>
                </template>
            </a-empty>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { searchManga } from '../api/manga'
import { formatNumber } from '@/utils/number'
import { useMangaNavigation } from '../composables/useMangaNavigation'

const route = useRoute()
const router = useRouter()
const { goToMangaDetail } = useMangaNavigation()

// 搜索状态
const searchKeyword = ref('')
const searchType = ref('')
const searchResults = ref([])
const loading = ref(false)
const error = ref('')
const hasSearched = ref(false)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(18)
const totalCount = ref(0)

// 过滤有效结果
const validResults = computed(() => {
    return searchResults.value.filter(item => {
        // 只要有name和path_word就认为是有效的
        return item && item.name && item.path_word
    })
})


// 截断文本
const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

// 处理图片加载错误
const handleImageError = (event) => {
    event.target.src = '/logo.png'
}

// 执行搜索
const performSearch = async () => {
    if (!searchKeyword.value.trim()) {
        searchResults.value = []
        totalCount.value = 0
        hasSearched.value = false
        return
    }

    loading.value = true
    error.value = ''

    const offset = (currentPage.value - 1) * pageSize.value

    await searchManga(searchKeyword.value, pageSize.value, offset, searchType.value).then(response => {
        searchResults.value = response.results.list || []
        totalCount.value = response.results.total || 0
        hasSearched.value = true

        // 更新URL查询参数
        const query = {
            q: searchKeyword.value,
            page: currentPage.value,
            size: pageSize.value
        }
        if (searchType.value) {
            query.type = searchType.value
        }
        router.replace({ query })
    }).catch(err => {
        console.error('搜索失败:', err)
        error.value = err.message || '搜索失败，请稍后重试'
        searchResults.value = []
        totalCount.value = 0
        message.error('搜索失败，请稍后重试')
    }).finally(() => {
        loading.value = false
    })
}

// 处理搜索
const handleSearch = () => {
    currentPage.value = 1
    performSearch()
}

// 处理筛选条件变化
const handleFilterChange = () => {
    currentPage.value = 1
    performSearch()
}

// 处理分页变化
const handlePageChange = (page, size) => {
    currentPage.value = page
    pageSize.value = size
    performSearch()
}

const handlePageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    performSearch()
}

// 从URL参数初始化搜索
const initFromQuery = () => {
    const query = route.query
    if (query.q) {
        searchKeyword.value = query.q
        currentPage.value = parseInt(query.page) || 1
        pageSize.value = parseInt(query.size) || 18
        searchType.value = query.type || ''

        // 执行搜索
        performSearch()
    }
}

onMounted(() => {
    initFromQuery()
})

// 监听路由查询参数变化
watch(() => route.query, () => {
    if (route.name === 'Search') {
        initFromQuery()
    }
}, { deep: true })
</script>

<style scoped src="../assets/styles/search.scss" lang="scss"></style>
