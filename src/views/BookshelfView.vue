<template>
    <div class="bookshelf-container">
        <div class="bookshelf-content">
            <a-tabs v-model:activeKey="activeTab" @change="handleTabChange" type="card" size="default">
                <template #rightExtra>
                    <div class="tab-extra-actions">
                        <a-button type="primary" size="small" @click="refreshCurrentTab" :loading="loading">
                            刷新
                        </a-button> <a-typography-text type="secondary" v-if="getCurrentTabUpdateTime() && !loading"
                            class="update-time">
                            {{ formatDate(getCurrentTabUpdateTime()) }}
                        </a-typography-text>
                    </div>
                </template>
                <!-- 漫画收藏标签页 -->
                <a-tab-pane key="manga" tab="漫画收藏">
                    <template #tab>
                        <span>
                            📚 漫画收藏
                            <a-badge v-if="mangaCount > 0" :count="mangaCount" :offset="[10, -5]" />
                        </span>
                    </template>
                    <MangaCollection :loading="loading && activeTab === 'manga'" @update-count="handleMangaCountUpdate"
                        @update-time="(time) => handleUpdateTime('manga', time)" ref="mangaCollectionRef" />
                </a-tab-pane> <!-- 轻小说收藏标签页 -->
                <a-tab-pane key="book" tab="轻小说收藏">
                    <template #tab>
                        <span>
                            📖 轻小说收藏
                            <a-badge v-if="bookCount > 0" :count="bookCount" :offset="[10, -5]" />
                        </span>
                    </template>
                    <BookCollection :loading="loading && activeTab === 'book'" @update-count="handleBookCountUpdate"
                        @update-time="(time) => handleUpdateTime('book', time)" ref="bookCollectionRef" />
                </a-tab-pane>

                <!-- 动画收藏标签页 -->
                <a-tab-pane key="cartoon" tab="动画收藏">
                    <template #tab>
                        <span>
                            🎬 动画收藏
                            <a-badge v-if="cartoonCount > 0" :count="cartoonCount" :offset="[10, -5]" />
                        </span>
                    </template>
                    <CartoonCollection :loading="loading && activeTab === 'cartoon'"
                        @update-count="handleCartoonCountUpdate"
                        @update-time="(time) => handleUpdateTime('cartoon', time)" ref="cartoonCollectionRef" />
                </a-tab-pane>

                <!-- 写真收藏标签页 -->
                <a-tab-pane key="post" tab="写真收藏">
                    <template #tab>
                        <span>
                            📷 写真收藏
                            <a-badge v-if="postCount > 0" :count="postCount" :offset="[10, -5]" />
                        </span>
                    </template>
                    <PostCollection :loading="loading && activeTab === 'post'" @update-count="handlePostCountUpdate"
                        @update-time="(time) => handleUpdateTime('post', time)" ref="postCollectionRef" />
                </a-tab-pane>
            </a-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { isLoggedIn } from '../utils/auth'
import { formatDate } from '../utils/date'
import MangaCollection from '../components/bookshelf/MangaCollection.vue'
import BookCollection from '../components/bookshelf/BookCollection.vue'
import CartoonCollection from '../components/bookshelf/CartoonCollection.vue'
import PostCollection from '../components/bookshelf/PostCollection.vue'

const router = useRouter()

// 标签页状态
const activeTab = ref('manga')
const loading = ref(false)

// 各个tab的更新时间
const lastUpdateTimes = ref({
    manga: null,
    book: null,
    cartoon: null,
    post: null
})

// 各个收藏类型的数量
const mangaCount = ref(0)
const bookCount = ref(0)
const cartoonCount = ref(0)
const postCount = ref(0)

// 子组件引用
const mangaCollectionRef = ref(null)
const bookCollectionRef = ref(null)
const cartoonCollectionRef = ref(null)
const postCollectionRef = ref(null)

// 处理标签页切换
const handleTabChange = (key) => {
    activeTab.value = key
    // console.log('切换到标签页:', key)
}

// 刷新当前标签页
const refreshCurrentTab = () => {
    loading.value = true

    switch (activeTab.value) {
        case 'manga':
            mangaCollectionRef.value?.refresh()
            break
        case 'book':
            bookCollectionRef.value?.refresh()
            break
        case 'cartoon':
            cartoonCollectionRef.value?.refresh()
            break
        case 'post':
            postCollectionRef.value?.refresh()
            break
    }

    setTimeout(() => {
        loading.value = false
    }, 1000)
}

// 处理漫画数量更新
const handleMangaCountUpdate = (count) => {
    mangaCount.value = count
}

// 处理轻小说数量更新
const handleBookCountUpdate = (count) => {
    bookCount.value = count
}

// 处理动画数量更新
const handleCartoonCountUpdate = (count) => {
    cartoonCount.value = count
}

// 处理写真数量更新
const handlePostCountUpdate = (count) => {
    postCount.value = count
}

// 处理更新时间
const handleUpdateTime = (tabKey, time) => {
    lastUpdateTimes.value[tabKey] = time
}

// 获取当前tab的更新时间
const getCurrentTabUpdateTime = () => {
    return lastUpdateTimes.value[activeTab.value]
}

// 组件挂载时检查登录状态
onMounted(() => {
    if (!isLoggedIn()) {
        message.warning('请先登录')
        router.push('/login')
        return
    }
})
</script>

<style scoped src="../assets/styles/bookshelf.scss" lang="scss"></style>
