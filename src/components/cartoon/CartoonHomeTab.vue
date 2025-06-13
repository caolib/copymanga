<template>
    <div class="cartoon-home-tab">
        <!-- 筛选区域 -->
        <div class="filters-section">
            <div class="filter-group">
                <div class="filter-label">排序方式</div>
                <div class="filter-buttons">
                    <a-button :type="ordering === '-datetime_updated' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-datetime_updated')">
                        最新更新
                    </a-button>
                    <a-button :type="ordering === '-popular' ? 'primary' : 'default'" size="small"
                        @click="changeOrdering('-popular')">
                        人气排序
                    </a-button>
                </div>
                <div class="filter-actions">
                    <a-button type="primary" @click="refreshCartoons" :icon="h(ReloadOutlined)" :loading="loading"
                        size="small">
                        刷新
                    </a-button>
                </div>
            </div>
            <div class="filter-group">
                <div class="filter-label">主题分类</div>
                <div class="filter-buttons">
                    <a-button :type="selectedTheme === '' ? 'primary' : 'default'" size="small"
                        @click="handleThemeChange('')">
                        全部主题
                    </a-button>
                    <a-button v-for="theme in themes" :key="theme.path_word"
                        :type="selectedTheme === theme.path_word ? 'primary' : 'default'" size="small"
                        @click="handleThemeChange(theme.path_word)">
                        {{ theme.name }} ({{ theme.count }})
                    </a-button>
                </div>
            </div>
        </div> <!-- 动画列表 -->
        <div class="cartoon-content">

            <!-- 骨架加载 -->
            <div v-if="loading && !cartoons.length" class="cartoon-grid">
                <div v-for="i in 18" :key="`skeleton-${i}`" class="cartoon-card">
                    <a-skeleton active>
                        <template #skeleton>
                            <div class="skeleton-cover">
                                <a-skeleton-image style="width: 100%; height: 100%; border-radius: 8px;" />
                            </div>
                            <div class="skeleton-info">
                                <a-skeleton-input style="width: 80%; margin-bottom: 8px;" size="small" />
                                <a-skeleton-input style="width: 60%; margin-bottom: 8px;" size="small" />
                                <div style="display: flex; gap: 4px;">
                                    <a-skeleton-button size="small" style="width: 40px; height: 20px;" />
                                    <a-skeleton-button size="small" style="width: 36px; height: 20px;" />
                                </div>
                            </div>
                        </template>
                    </a-skeleton>
                </div>
            </div>

            <!-- 实际数据 -->
            <div v-else-if="cartoons.length" class="cartoon-grid">
                <div v-for="cartoon in cartoons" :key="cartoon.path_word" class="cartoon-card"
                    @click="goToDetail(cartoon.path_word)">
                    <div class="cartoon-cover">
                        <a-image :src="cartoon.cover" :alt="cartoon.name" :preview="false"
                            style="width: 100%; height: 100%; object-fit: cover;" />
                        <div class="cartoon-count">{{ cartoon.count }}集</div>
                    </div>
                    <div class="cartoon-info">
                        <h4 class="cartoon-title" :title="cartoon.name">{{ cartoon.name }}</h4>
                        <div class="cartoon-meta">
                            <span class="cartoon-date">{{ formatDate(cartoon.datetime_updated) }}</span>
                            <span class="cartoon-popular">{{ formatNumber(cartoon.popular) }}人气</span>
                        </div>
                        <div class="cartoon-themes" v-if="cartoon.theme && cartoon.theme.length">
                            <a-tag v-for="theme in cartoon.theme.slice(0, 3)" :key="theme.name" size="small">
                                {{ theme.name }}
                            </a-tag>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <a-empty v-else description="暂无动画数据" />
        </div> <!-- 加载更多 -->
        <div class="load-more" v-if="cartoons.length && hasMore">
            <a-button @mouseenter="loadMore" :loading="loadingMore" type="default" block>
                加载更多
            </a-button>
        </div>

        <!-- 无更多数据提示 -->
        <div class="no-more" v-if="cartoons.length && !hasMore">
            <a-divider>已加载全部内容</a-divider>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getCartoonHome, getCartoonThemes } from '../../api/cartoon'
import { formatDate } from '../../utils/date'
import { formatNumber } from '../../utils/number'
import { ReloadOutlined } from '@ant-design/icons-vue'

const router = useRouter()

const ordering = ref('-datetime_updated')
const selectedTheme = ref('')
const themes = ref([])
const cartoons = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const limit = ref(18)
const offset = ref(0)

const hasMore = computed(() => cartoons.value.length < total.value)

// 缓存相关
const THEME_CACHE_KEY = 'cartoon_themes_cache'
const THEME_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7天缓存

// 获取主题缓存数据
const getThemeCachedData = () => {
    const cached = localStorage.getItem(THEME_CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()

    if (now - timestamp > THEME_CACHE_DURATION) {
        localStorage.removeItem(THEME_CACHE_KEY)
        return null
    }

    return data
}

// 设置主题缓存数据
const setThemeCachedData = (data) => {
    const cacheData = {
        data,
        timestamp: Date.now()
    }
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cacheData))
}

// 获取动画主题列表
const loadThemes = () => {
    // 先尝试从缓存获取数据
    const cachedData = getThemeCachedData()
    if (cachedData) {
        themes.value = cachedData
        return
    }

    getCartoonThemes().then(response => {
        const responseData = response.data || response

        if (responseData && responseData.results && responseData.results.list) {
            // 过滤掉count为0的主题
            const filteredThemes = responseData.results.list.filter(theme => theme.count > 0)
            themes.value = filteredThemes

            // 缓存数据
            setThemeCachedData(filteredThemes)
        } else {
            console.warn('主题响应数据格式不正确:', responseData)
        }
    }).catch(err => {
        console.error('获取动画主题失败:', err)
        message.error('获取动画主题失败')
    })
}

// 加载动画列表
const loadCartoons = (isLoadMore = false) => {
    if (isLoadMore) {
        loadingMore.value = true
        offset.value = cartoons.value.length
    } else {
        loading.value = true
        offset.value = 0
    }

    getCartoonHome(limit.value, offset.value, ordering.value, selectedTheme.value).then(response => {
        const responseData = response.data || response

        if (responseData && responseData.results && responseData.results.list) {
            const newCartoons = responseData.results.list || []

            if (isLoadMore) {
                cartoons.value.push(...newCartoons)
            } else {
                cartoons.value = newCartoons
            }

            total.value = responseData.results.total || 0
        } else {
            console.error('响应数据格式不正确:', responseData)
        }
    }).catch(err => {
        console.error('获取动画列表失败:', err)
        message.error('获取动画列表失败')
    }).finally(() => {
        loading.value = false
        loadingMore.value = false
    })
}

const loadMore = () => {
    if (!hasMore.value || loadingMore.value) return
    loadCartoons(true)
}

const refreshCartoons = () => {
    // 同时刷新主题和动画数据
    localStorage.removeItem(THEME_CACHE_KEY) // 清除主题缓存
    loadThemes() // 重新加载主题
    loadCartoons(false) // 重新加载动画
}

const changeOrdering = (newOrdering) => {
    ordering.value = newOrdering
}

const handleThemeChange = (themePathWord) => {
    selectedTheme.value = themePathWord
}

const goToDetail = (pathWord) => {
    router.push(`/cartoon/${pathWord}`)
}

// 监听排序方式和主题变化
watch([ordering, selectedTheme], () => {
    loadCartoons(false)
})

onMounted(() => {
    loadThemes()
    loadCartoons(false)
})
</script>

<style lang="scss" src="../../assets/styles/cartoon-home-tab.scss" scoped></style>
