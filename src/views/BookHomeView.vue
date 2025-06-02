<template>
    <div class="book-home-container">
        <div class="header">
            <h1>轻小说</h1>
            <div class="filters">
                <div class="sort-options">
                    <a-button :type="currentOrdering === '-popular' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-popular')">
                        人气
                    </a-button>
                    <a-button :type="currentOrdering === '-datetime_updated' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-datetime_updated')">
                        更新
                    </a-button>
                </div>
            </div>
        </div>

        <a-skeleton active v-if="loading" :paragraph="{ rows: 10 }" :loading="loading" />

        <div class="books-grid" v-else>
            <div v-for="book in books" :key="book.path_word" class="book-card" @click="goToDetail(book.path_word)">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBookHome } from '@/api/book'
import { useBookStore } from '@/stores/book'
import { message } from 'ant-design-vue'

const router = useRouter()
const bookStore = useBookStore()
const books = ref([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(18)
const currentOrdering = ref('-popular')
const currentTheme = ref('')

const fetchBooks = async () => {
    loading.value = true

    await getBookHome({
        ordering: currentOrdering.value,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
        theme: currentTheme.value,
        platform: 3,
    }).then(response => {
        books.value = response.results.list
        total.value = response.results.total
    }).catch(error => {
        console.error('获取轻小说列表失败:', error)
        message.error('获取轻小说列表失败，请检查网络连接')
    }).finally(() => {
        loading.value = false
    })
}

const handlePageChange = (page) => {
    currentPage.value = page
    fetchBooks()
}

const changeOrdering = (ordering) => {
    if (currentOrdering.value === ordering) return
    currentOrdering.value = ordering
    currentPage.value = 1
    fetchBooks()
}

const goToDetail = (pathWord) => {
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

const formatDate = (dateStr) => {
    if (!dateStr) return '未知'
    return dateStr
}

onMounted(() => {
    fetchBooks()
})
</script>

<style scoped src="../assets/styles/book-home-view.scss" lang="scss"></style>
