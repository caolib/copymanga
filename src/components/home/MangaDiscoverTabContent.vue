<template>
    <div class="manga-discover-tab">
        <!-- 过滤器 -->
        <div class="filters-section">
            <div class="filter-group filter-row">
                <div class="filter-section">
                    <div class="filter-buttons">
                        <a-button :type="currentFilter.ordering === '-popular' ? 'primary' : 'default'" size="small"
                            :icon="h(FireOutlined)" @click="changeOrdering('-popular')">
                            热度
                        </a-button>
                        <a-button :type="currentFilter.ordering === '-datetime_updated' ? 'primary' : 'default'"
                            size="small" :icon="h(FieldTimeOutlined)" @click="changeOrdering('-datetime_updated')">
                            最新
                        </a-button>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-buttons">
                        <a-button :type="currentFilter.top === '' ? 'primary' : 'default'" size="small"
                            @click="changeTop('')">
                            全部
                        </a-button>
                        <a-button v-for="top in filterTags.top" :key="top.path_word"
                            :type="currentFilter.top === top.path_word ? 'primary' : 'default'" size="small"
                            @click="changeTop(top.path_word)">
                            {{ top.name }}
                        </a-button>
                    </div>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-buttons">
                    <a-button :type="currentFilter.theme === '' ? 'primary' : 'default'" size="small"
                        @click="changeTheme('')">
                        全部
                    </a-button>
                    <a-button v-for="theme in filterTags.theme" :key="theme.path_word"
                        :type="currentFilter.theme === theme.path_word ? 'primary' : 'default'" size="small"
                        @click="changeTheme(theme.path_word)">
                        {{ theme.name }} ({{ theme.count }})
                    </a-button>
                </div>
            </div>
        </div>

        <!-- 漫画列表 -->
        <a-spin :spinning="loading && mangaList.length === 0">
            <a-row :gutter="16" class="manga-list">
                <a-col class="manga-col" v-for="manga in mangaList" :key="manga.path_word" :xs="12" :sm="8" :md="6"
                    :lg="4">
                    <a-card hoverable class="manga-card" @click="goToMangaDetail(manga)">
                        <img :src="manga.cover" :alt="manga.name" class="manga-cover" />
                        <div class="manga-info">
                            <div class="manga-title">{{ manga.name }}</div>
                            <div class="manga-author">{{ getAuthors(manga.author) }}</div>
                            <div class="manga-date">更新: {{ formatDate(manga.datetime_updated) }}</div>
                        </div>
                    </a-card>
                </a-col>
            </a-row>
        </a-spin>

        <!-- 加载更多 -->
        <div v-if="hasMore && !loading" class="load-more-container" @mouseenter="loadMore">
            <div class="load-more-text" :class="{ 'loading': loading }">
                {{ loading ? '加载中...' : '加载更多' }}
            </div>
        </div>
        <div v-else-if="mangaList.length > 0" class="load-more-container">
            <div class="load-more-text no-more">没有更多了</div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMangaDiscoverStore } from '@/stores/manga-discover'
import { formatDate } from '@/utils/date'
import { message } from 'ant-design-vue'
import { useMangaNavigation } from '@/composables/useMangaNavigation'
import { h } from 'vue'
import {
    FireOutlined,
    FieldTimeOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const mangaDiscoverStore = useMangaDiscoverStore()
const { goToMangaDetail } = useMangaNavigation()

// 数据绑定
const mangaList = computed(() => mangaDiscoverStore.mangaList)
const filterTags = computed(() => mangaDiscoverStore.filterTags)
const currentFilter = computed(() => mangaDiscoverStore.currentFilter)
const loading = computed(() => mangaDiscoverStore.isLoading)
const hasMore = computed(() => mangaDiscoverStore.hasMore)
const hasCache = computed(() => mangaDiscoverStore.hasCache)
const hasTagsCache = computed(() => mangaDiscoverStore.hasTagsCache)

// 初始化数据
const initData = async () => {
    console.log('初始化漫画发现数据, 缓存状态:', {
        hasTagsCache: hasTagsCache.value,
        hasCache: hasCache.value
    })

    // 先获取过滤标签
    const tagsResult = await mangaDiscoverStore.fetchFilterTags()
    if (!tagsResult.success && !tagsResult.fromCache) {
        message.error('获取过滤标签失败，请检查网络连接')
    }

    // 获取漫画列表
    const listResult = await mangaDiscoverStore.fetchMangaList()
    if (!listResult.success && !listResult.fromCache) {
        message.error('获取漫画列表失败，请检查网络连接')
    }
}

// 更改排序方式
const changeOrdering = (ordering) => {
    if (currentFilter.value.ordering === ordering) return
    mangaDiscoverStore.updateFilter({ ordering })
}

// 更改主题
const changeTheme = (theme) => {
    if (currentFilter.value.theme === theme) return
    mangaDiscoverStore.updateFilter({ theme })
}

// 更改地区
const changeTop = (top) => {
    if (currentFilter.value.top === top) return
    mangaDiscoverStore.updateFilter({ top })
}

// 加载更多
const loadMore = () => {
    if (!loading.value && hasMore.value) {
        mangaDiscoverStore.loadMore()
    }
}

// 获取作者列表
const getAuthors = (authors) => {
    if (!authors || !authors.length) return '未知作者'
    return authors.map(author => author.name).join(', ')
}

onMounted(() => {
    initData()
})
</script>

<style src="../../assets/styles/manga-discover.scss" lang="scss" scoped></style>