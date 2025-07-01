<template>
    <div class="user-profile-container">
        <div class="user-profile-content">
            <!-- 头部用户信息卡片 -->
            <a-card class="user-header-card" :bordered="false">
                <div class="user-header">
                    <a-avatar :size="80" :src="getAvatarUrl(userInfo?.avatar) || '/logo.png'" />
                    <div class="user-basic-info">
                        <h3>{{ userInfo?.nickname || userInfo?.username || '用户' }}</h3>
                        <p class="username">{{ userInfo?.username || '-' }}</p>
                        <p class="join-date">
                            加入时间：{{ formatDate(userInfo?.datetime_created) }}
                        </p>
                    </div>
                </div>
            </a-card> <!-- 标签页内容 -->
            <a-tabs v-model:activeKey="activeTab" type="card" class="profile-tabs" @change="handleTabChange">
                <template #rightExtra>
                    <a-button v-if="activeTab.startsWith('browse-')" type="primary" size="small"
                        @click="refreshCurrentBrowseHistory" :loading="getCurrentBrowseData().loading">
                        刷新
                    </a-button>
                </template>

                <!-- 漫画浏览记录标签页 -->
                <a-tab-pane key="browse-comics" tab="漫画浏览">
                    <template #tab>
                        <span>
                            📚 漫画浏览
                            <a-badge v-if="browseHistory.comics.total > 0" :count="browseHistory.comics.total"
                                :offset="[10, -5]" />
                        </span>
                    </template>

                    <div class="browse-history-content">
                        <!-- 操作栏 -->
                        <div class="browse-controls" v-if="browseHistory.comics.list.length > 0">
                            <div class="controls-left">
                                <span class="total-info">共 {{ browseHistory.comics.total }} 条漫画浏览记录</span>
                            </div>
                        </div>

                        <!-- 空状态 -->
                        <a-empty v-if="!browseHistory.comics.loading && browseHistory.comics.list.length === 0"
                            description="您还没有浏览任何漫画">
                            <a-button type="primary" @click="$router.push('/')">去首页看看</a-button>
                        </a-empty>

                        <!-- 加载骨架屏 -->
                        <div v-if="browseHistory.comics.loading && browseHistory.comics.list.length === 0"
                            class="browse-grid">
                            <a-card v-for="n in 12" :key="n" class="browse-card skeleton-card">
                                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                                    <template #avatar>
                                        <div class="skeleton-cover"></div>
                                    </template>
                                </a-skeleton>
                            </a-card>
                        </div>

                        <!-- 浏览记录网格 -->
                        <div v-else-if="browseHistory.comics.list.length > 0" class="browse-grid">
                            <a-card v-for="item in browseHistory.comics.list" :key="item.id" hoverable
                                class="browse-card" @click="goToMangaDetail(item)">
                                <div class="browse-cover">
                                    <img :src="item.comic?.cover" :alt="item.comic?.name" />
                                </div>
                                <a-card-meta :title="item.comic?.name">
                                    <template #description>
                                        <div class="browse-author" v-if="item.comic?.author?.length">
                                            {{item.comic.author.map(a => a.name).join(', ')}}
                                        </div>
                                        <div class="last-chapter">
                                            上次看到：{{ item.last_chapter_name }}
                                        </div>
                                        <div class="browse-time">
                                            更新时间：{{ formatDate(item.comic?.datetime_updated) }}
                                        </div>
                                    </template>
                                </a-card-meta>
                            </a-card>
                        </div>

                        <!-- 加载更多 -->
                        <div v-if="browseHistory.comics.hasMore && browseHistory.comics.list.length > 0"
                            class="load-more">
                            <a-button type="primary" @mouseenter="loadMore('comics')"
                                :loading="browseHistory.comics.loading" block>
                                加载更多
                            </a-button>
                        </div>
                    </div>
                </a-tab-pane>

                <!-- 轻小说浏览记录标签页 -->
                <a-tab-pane key="browse-books" tab="轻小说浏览">
                    <template #tab>
                        <span>
                            📖 轻小说浏览
                            <a-badge v-if="browseHistory.books.total > 0" :count="browseHistory.books.total"
                                :offset="[10, -5]" />
                        </span>
                    </template>

                    <div class="browse-history-content">
                        <!-- 操作栏 -->
                        <div class="browse-controls" v-if="browseHistory.books.list.length > 0">
                            <div class="controls-left">
                                <span class="total-info">共 {{ browseHistory.books.total }} 条轻小说浏览记录</span>
                            </div>
                        </div>

                        <!-- 空状态 -->
                        <a-empty v-if="!browseHistory.books.loading && browseHistory.books.list.length === 0"
                            description="您还没有浏览任何轻小说">
                            <a-button type="primary" @click="$router.push('/book')">去书库看看</a-button>
                        </a-empty>

                        <!-- 加载骨架屏 -->
                        <div v-if="browseHistory.books.loading && browseHistory.books.list.length === 0"
                            class="browse-grid">
                            <a-card v-for="n in 12" :key="n" class="browse-card skeleton-card">
                                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                                    <template #avatar>
                                        <div class="skeleton-cover"></div>
                                    </template>
                                </a-skeleton>
                            </a-card>
                        </div>

                        <!-- 浏览记录网格 -->
                        <div v-else-if="browseHistory.books.list.length > 0" class="browse-grid">
                            <a-card v-for="item in browseHistory.books.list" :key="item.id" hoverable
                                class="browse-card" @click="goToBookDetail(item)">
                                <div class="browse-cover">
                                    <img :src="item.book?.cover" :alt="item.book?.name" />
                                </div>
                                <a-card-meta :title="item.book?.name">
                                    <template #description>
                                        <div class="browse-author" v-if="item.book?.author?.length">
                                            {{item.book.author.map(a => a.name).join(', ')}}
                                        </div>
                                        <div class="last-chapter">
                                            上次看到：{{ item.last_volume_name }}
                                        </div>
                                        <div class="browse-time">
                                            更新时间：{{ formatDate(item.book?.datetime_updated) }}
                                        </div>
                                    </template>
                                </a-card-meta>
                            </a-card>
                        </div>

                        <!-- 加载更多 -->
                        <div v-if="browseHistory.books.hasMore && browseHistory.books.list.length > 0"
                            class="load-more">
                            <a-button type="primary" @mouseenter="loadMore('books')"
                                :loading="browseHistory.books.loading" block>
                                加载更多
                            </a-button>
                        </div>
                    </div>
                </a-tab-pane>

                <!-- 写真浏览记录标签页 -->
                <a-tab-pane key="browse-posts" tab="写真浏览">
                    <template #tab>
                        <span>
                            🖼️ 写真浏览
                            <a-badge v-if="browseHistory.posts.total > 0" :count="browseHistory.posts.total"
                                :offset="[10, -5]" />
                        </span>
                    </template>

                    <div class="browse-history-content">
                        <!-- 操作栏 -->
                        <div class="browse-controls" v-if="browseHistory.posts.list.length > 0">
                            <div class="controls-left">
                                <span class="total-info">共 {{ browseHistory.posts.total }} 条写真浏览记录</span>
                            </div>
                        </div>

                        <!-- 空状态 -->
                        <a-empty v-if="!browseHistory.posts.loading && browseHistory.posts.list.length === 0"
                            description="您还没有浏览任何写真">
                            <a-button type="primary" @click="$router.push('/post')">去写真看看</a-button>
                        </a-empty>

                        <!-- 加载骨架屏 -->
                        <div v-if="browseHistory.posts.loading && browseHistory.posts.list.length === 0"
                            class="browse-grid">
                            <a-card v-for="n in 12" :key="n" class="browse-card skeleton-card">
                                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                                    <template #avatar>
                                        <div class="skeleton-cover"></div>
                                    </template>
                                </a-skeleton>
                            </a-card>
                        </div>

                        <!-- 浏览记录网格 -->
                        <div v-else-if="browseHistory.posts.list.length > 0" class="browse-grid">
                            <a-card v-for="item in browseHistory.posts.list" :key="item.id" hoverable
                                class="browse-card" @click="goToPostDetail(item)">
                                <div class="browse-cover">
                                    <img :src="item.post?.cover" :alt="item.post?.name" />
                                </div>
                                <a-card-meta :title="item.post?.name">
                                    <template #description>
                                        <div class="browse-author" v-if="item.post?.author?.length">
                                            {{item.post.author.map(a => a.name).join(', ')}}
                                        </div>
                                        <div class="last-chapter">
                                            上次看到：{{ item.last_chapter_name }}
                                        </div>
                                        <div class="browse-time">
                                            更新时间：{{ formatDate(item.post?.datetime_updated) }}
                                        </div>
                                    </template>
                                </a-card-meta>
                            </a-card>
                        </div>

                        <!-- 加载更多 -->
                        <div v-if="browseHistory.posts.hasMore && browseHistory.posts.list.length > 0"
                            class="load-more">
                            <a-button type="primary" @mouseenter="loadMore('posts')"
                                :loading="browseHistory.posts.loading" block>
                                加载更多
                            </a-button>
                        </div>
                    </div>
                </a-tab-pane>

                <!-- 动画浏览记录标签页 -->
                <a-tab-pane key="browse-cartoons" tab="动画浏览">
                    <template #tab>
                        <span>
                            🎬 动画浏览
                            <a-badge v-if="browseHistory.cartoons.total > 0" :count="browseHistory.cartoons.total"
                                :offset="[10, -5]" />
                        </span>
                    </template>

                    <div class="browse-history-content">
                        <!-- 操作栏 -->
                        <div class="browse-controls" v-if="browseHistory.cartoons.list.length > 0">
                            <div class="controls-left">
                                <span class="total-info">共 {{ browseHistory.cartoons.total }} 条动画浏览记录</span>
                            </div>
                        </div>

                        <!-- 空状态 -->
                        <a-empty v-if="!browseHistory.cartoons.loading && browseHistory.cartoons.list.length === 0"
                            description="您还没有浏览任何动画">
                            <a-button type="primary" @click="$router.push('/cartoon')">去动画看看</a-button>
                        </a-empty>

                        <!-- 加载骨架屏 -->
                        <div v-if="browseHistory.cartoons.loading && browseHistory.cartoons.list.length === 0"
                            class="browse-grid">
                            <a-card v-for="n in 12" :key="n" class="browse-card skeleton-card">
                                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                                    <template #avatar>
                                        <div class="skeleton-cover"></div>
                                    </template>
                                </a-skeleton>
                            </a-card>
                        </div>

                        <!-- 浏览记录网格 -->
                        <div v-else-if="browseHistory.cartoons.list.length > 0" class="browse-grid">
                            <a-card v-for="item in browseHistory.cartoons.list" :key="item.id" hoverable
                                class="browse-card" @click="goToCartoonDetail(item)">
                                <div class="browse-cover">
                                    <img :src="item.cartoon?.cover" :alt="item.cartoon?.name" />
                                </div>
                                <a-card-meta :title="item.cartoon?.name">
                                    <template #description>
                                        <div class="browse-author" v-if="item.cartoon?.author?.length">
                                            {{item.cartoon.author.map(a => a.name).join(', ')}}
                                        </div>
                                        <div class="last-chapter">
                                            上次看到：{{ item.last_chapter_name }}
                                        </div>
                                        <div class="browse-time">
                                            更新时间：{{ formatDate(item.cartoon?.datetime_updated) }}
                                        </div>
                                    </template>
                                </a-card-meta>
                            </a-card>
                        </div>

                        <!-- 加载更多 -->
                        <div v-if="browseHistory.cartoons.hasMore && browseHistory.cartoons.list.length > 0"
                            class="load-more">
                            <a-button type="primary" @mouseenter="loadMore('cartoons')"
                                :loading="browseHistory.cartoons.loading" block>
                                加载更多
                            </a-button>
                        </div>
                    </div>
                </a-tab-pane>
            </a-tabs>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('browse-comics')

const userInfo = computed(() => userStore.userInfo)
const browseHistory = computed(() => userStore.browseHistory)

// 格式化日期
const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}

// 获取当前选项卡的浏览数据
const getCurrentBrowseData = () => {
    const type = activeTab.value.replace('browse-', '')
    return browseHistory.value[type] || { loading: false }
}

// 获取类型标签
const getTypeLabel = (type) => {
    const labels = {
        comics: '漫画',
        books: '轻小说',
        posts: '写真',
        cartoons: '动画'
    }
    return labels[type] || type
}

// 加载浏览记录
const loadBrowseHistory = async (type, reset = false) => {
    try {
        const offset = reset ? 0 : browseHistory.value[type].list.length
        await userStore.fetchBrowseHistory(type, offset, 18, reset)
    } catch (error) {
        message.error(`加载${getTypeLabel(type)}浏览记录失败`)
    }
}

// 标签页切换处理
const handleTabChange = (key) => {
    if (key.startsWith('browse-')) {
        const type = key.replace('browse-', '')
        // 如果还没有加载过数据，则加载
        if (browseHistory.value[type].list.length === 0) {
            loadBrowseHistory(type, true)
        }
    }
}

// 获取头像完整URL
const getAvatarUrl = (avatar) => {
    if (!avatar) return '/logo.png'
    if (avatar.startsWith('http')) return avatar
    return `https://s3.mangafuna.xyz/${avatar}`
}

// 刷新当前浏览记录
const refreshCurrentBrowseHistory = async () => {
    const type = activeTab.value.replace('browse-', '')
    userStore.resetBrowseHistory(type)
    await loadBrowseHistory(type, true)
}

// 加载更多
const loadMore = (type) => {
    loadBrowseHistory(type, false)
}

// 跳转到详情页
const goToMangaDetail = (item) => {
    router.push(`/manga/${item.comic?.path_word}`)
}

const goToBookDetail = (item) => {
    router.push(`/book/${item.book?.path_word}`)
}

const goToPostDetail = (item) => {
    router.push(`/post/${item.post?.uuid}`)
}

const goToCartoonDetail = (item) => {
    router.push(`/cartoon/${item.cartoon?.path_word}`)
}

// 组件挂载时加载数据
onMounted(async () => {
    if (userStore.isLoggedIn) {
        try {
            // 获取最新用户信息
            await userStore.fetchUserInfo()
            // 获取默认的漫画浏览记录
            await loadBrowseHistory('comics', true)
        } catch (error) {
            console.error('加载用户数据失败:', error)
        }
    }
})
</script>

<style scoped src="../assets/styles/user-profile.scss" lang="scss"></style>
