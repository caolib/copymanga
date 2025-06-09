<template>
    <div class="book-home-container">
        <div class="header">
            <h1>轻小说</h1>
            <div class="header-actions">
                <a-button type="primary" @click="refreshBooks" :loading="loading" size="small">
                    刷新数据
                </a-button>
                <div v-if="lastUpdateTime" class="update-info">
                    <a-typography-text type="secondary" style="font-size: 12px;">
                        最后更新：{{ formatDate(lastUpdateTime) }}
                    </a-typography-text>
                </div>
            </div>
        </div>

        <div class="filters-section">
            <div class="filter-group">
                <div class="filter-label">排序方式</div>
                <div class="filter-buttons">
                    <a-button :type="currentOrdering === '-popular' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-popular')">
                        人气排序
                    </a-button>
                    <a-button :type="currentOrdering === '-datetime_updated' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-datetime_updated')">
                        更新时间
                    </a-button>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-label">主题分类</div>
                <div class="filter-buttons">
                    <a-button :type="currentTheme === '' ? 'primary' : 'default'" size="small"
                        @click="handleThemeChange('')">
                        全部主题
                    </a-button>
                    <a-button v-for="theme in themes" :key="theme.path_word"
                        :type="currentTheme === theme.path_word ? 'primary' : 'default'" size="small"
                        @click="handleThemeChange(theme.path_word)">
                        {{ theme.name }} ({{ theme.count }})
                    </a-button>
                </div>
            </div>
        </div>

        <a-skeleton active v-if="loading" :paragraph="{ rows: 10 }" :loading="loading" />

        <div class="books-grid" v-else>
            <div v-for="book in books" :key="book.path_word" class="book-card" @click="goToBookDetail(book.path_word)">
                <div class="book-cover">
                    <img :src="book.cover" :alt="book.name" />
                    <div class="book-status" :class="{ completed: book.status === 1 }">
                        {{ book.status === 1 ? '已完结' : '连载中' }}
                    </div>
                </div>
                <div class="book-info">
                    <h3 class="book-title">{{ book.name }}</h3>
                    <p class="book-author">{{ getAuthors(book.author) }}</p>
                    <p class="book-date">更新: {{ formatDate(book.datetime_updated) }}</p>
                </div>
            </div>
        </div>

        <div class="pagination" v-if="!loading && total > 0">
            <a-pagination v-model:current="currentPage" :pageSize="pageSize" :total="total"
                @change="handlePageChange" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookStore } from '@/stores/book'
import { useBookHomeStore } from '@/stores/book-home'
import { useBookThemeStore } from '@/stores/book-theme'
import { message } from 'ant-design-vue'
import { formatDate } from '@/utils/date'

const router = useRouter()
const bookStore = useBookStore()
const bookHomeStore = useBookHomeStore()
const bookThemeStore = useBookThemeStore()
const books = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(18)
const currentOrdering = ref('-popular')
const currentTheme = ref('')
const lastUpdateTime = ref(null)

// 使用 store 的状态
const loading = computed(() => bookHomeStore.isLoading)
const themes = computed(() => bookThemeStore.themes)

const fetchBooks = async (forceRefresh = false) => {
    const result = await bookHomeStore.fetchBookHome({
        ordering: currentOrdering.value,
        page: currentPage.value,
        pageSize: pageSize.value,
        theme: currentTheme.value,
        platform: 3
    }, forceRefresh)

    if (result.success) {
        books.value = result.data.list
        total.value = result.data.total

        if (!result.fromCache) {
            lastUpdateTime.value = new Date().toISOString()
            message.success(forceRefresh ? '轻小说列表已刷新' : '轻小说列表加载成功')
        }

        // 预加载下一页（如果不是强制刷新且有下一页）
        if (!forceRefresh && currentPage.value < Math.ceil(total.value / pageSize.value)) {
            bookHomeStore.preloadNextPage(
                currentOrdering.value,
                currentPage.value,
                pageSize.value,
                currentTheme.value,
                total.value
            )
        }
    } else {
        message.error(result.error?.message || '获取轻小说列表失败，请检查网络连接')
    }
}

const handlePageChange = (page) => {
    currentPage.value = page
    fetchBooks()
}

const changeOrdering = (ordering) => {
    if (currentOrdering.value === ordering) return
    currentOrdering.value = ordering
    currentPage.value = 1
    // 清除当前页的缓存
    bookHomeStore.clearPageCache(ordering, 1, pageSize.value, currentTheme.value)
    fetchBooks()
}

// 刷新数据
const refreshBooks = () => {
    // 清除当前页缓存
    bookHomeStore.clearPageCache(currentOrdering.value, currentPage.value, pageSize.value, currentTheme.value)
    // 强制刷新
    fetchBooks(true)
}

// 主题筛选变化处理
const handleThemeChange = (value) => {
    if (currentTheme.value === value) return
    currentTheme.value = value || ''
    currentPage.value = 1
    // 清除缓存，因为主题变化了
    bookHomeStore.clearPageCache(currentOrdering.value, 1, pageSize.value, currentTheme.value)
    fetchBooks()
}

// 获取主题数据
const fetchThemes = async () => {
    await bookThemeStore.fetchThemes()
}

const goToBookDetail = (pathWord) => {
    const book = books.value.find(book => book.path_word === pathWord)
    if (book) {
        bookStore.currentBook = book
        bookStore.pathWord = pathWord
    }
    router.push({
        name: 'BookDetail',
        params: { pathWord }
    })
}

const getAuthors = (authors) => {
    if (!authors || !authors.length) return '未知作者'
    return authors.map(author => author.name).join(', ')
}

onMounted(() => {
    // 先获取主题数据，然后获取书籍数据
    fetchThemes().then(() => {
        fetchBooks()
    })
})
</script>

<style scoped src="../assets/styles/book-home.scss" lang="scss"></style>
