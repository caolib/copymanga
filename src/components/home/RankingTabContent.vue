<template>
    <div class="ranking-tab">
        <!-- 过滤器 -->
        <div class="filters-section">
            <div class="filter-group">
                <div class="filter-buttons">
                    <a-button :type="contentType === 1 ? 'primary' : 'default'" size="small"
                        @click="handleContentTypeChange(1)">
                        漫画
                    </a-button>
                    <a-button :type="contentType === 5 ? 'primary' : 'default'" size="small"
                        @click="handleContentTypeChange(5)">
                        轻小说
                    </a-button>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-buttons">
                    <a-button :type="dateType === 'day' ? 'primary' : 'default'" size="small"
                        @click="handleDateTypeChange('day')">
                        日榜
                    </a-button>
                    <a-button :type="dateType === 'week' ? 'primary' : 'default'" size="small"
                        @click="handleDateTypeChange('week')">
                        周榜
                    </a-button>
                    <a-button :type="dateType === 'month' ? 'primary' : 'default'" size="small"
                        @click="handleDateTypeChange('month')">
                        月榜
                    </a-button>
                    <a-button :type="dateType === 'total' ? 'primary' : 'default'" size="small"
                        @click="handleDateTypeChange('total')">
                        总榜
                    </a-button>
                </div>
            </div>

            <div class="filter-group">
                <div class="filter-buttons">
                    <a-button :type="audienceType === '' ? 'primary' : 'default'" size="small"
                        @click="handleAudienceTypeChange('')">
                        全部
                    </a-button>
                    <a-button :type="audienceType === 'male' ? 'primary' : 'default'" size="small"
                        @click="handleAudienceTypeChange('male')">
                        男频
                    </a-button>
                    <a-button :type="audienceType === 'female' ? 'primary' : 'default'" size="small"
                        @click="handleAudienceTypeChange('female')">
                        女频
                    </a-button>
                </div>
            </div>
        </div>

        <!-- 列表加载中 -->
        <div v-if="isLoading && !rankingList.length" class="loading-container">
            <a-spin tip="加载中..." size="large" />
        </div>

        <!-- 排行榜列表 -->
        <a-spin :spinning="isLoading && rankingList.length === 0">
            <a-row :gutter="16" class="manga-list">
                <a-col class="manga-col" v-for="(item, index) in rankingList" :key="index" :xs="12" :sm="8" :md="6"
                    :lg="4">
                    <a-card hoverable class="manga-card" @click="handleItemClick(item)">
                        <div class="rank-number" :class="{ 'top3': index < 3 }">{{ index + 1 }}</div>
                        <!-- 漫画和轻小说的数据结构不同，需要分别处理 -->
                        <template v-if="contentType === 1 && item.comic">
                            <img :src="item.comic.cover || ''" :alt="item.comic.name || '未知'" class="manga-cover" />
                            <div class="manga-info">
                                <div class="manga-title">{{ item.comic.name || '未知标题' }}</div>
                                <div class="manga-author">
                                    <template v-if="item.comic.author && item.comic.author.length">
                                        {{item.comic.author.map(a => a.name).join(', ')}}
                                    </template>
                                </div>
                                <div class="manga-stats">
                                    <span class="popular">热度: {{ formatNumber(item.popular || 0) }}</span>
                                    <span class="rise"
                                        :class="{ 'up': item.rise_sort > 0, 'down': item.rise_sort < 0 }">
                                        <template v-if="item.rise_sort > 0">↑{{ item.rise_sort }}</template>
                                        <template v-else-if="item.rise_sort < 0">↓{{ Math.abs(item.rise_sort)
                                        }}</template>
                                        <template v-else>-</template>
                                    </span>
                                </div>
                            </div>
                        </template>
                        <template v-else-if="contentType === 5 && item.book">
                            <img :src="item.book.cover || ''" :alt="item.book.name || '未知'" class="manga-cover" />
                            <div class="manga-info">
                                <div class="manga-title">{{ item.book.name || '未知标题' }}</div>
                                <div class="manga-author">
                                    <template v-if="item.book.author && item.book.author.length">
                                        {{item.book.author.map(a => a.name).join(', ')}}
                                    </template>
                                </div>
                                <div class="manga-stats">
                                    <span class="popular">热度: {{ formatNumber(item.popular || 0) }}</span>
                                    <span class="rise"
                                        :class="{ 'up': item.rise_sort > 0, 'down': item.rise_sort < 0 }">
                                        <template v-if="item.rise_sort > 0">↑{{ item.rise_sort }}</template>
                                        <template v-else-if="item.rise_sort < 0">↓{{ Math.abs(item.rise_sort)
                                        }}</template>
                                        <template v-else>-</template>
                                    </span>
                                </div>
                            </div>
                        </template>
                        <template v-else>
                            <!-- 数据异常时的备用显示 -->
                            <div class="manga-cover"
                                style="height: 210px; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                                <span>数据加载中</span>
                            </div>
                            <div class="manga-info">
                                <div class="manga-title">加载中...</div>
                                <div class="manga-author"></div>
                                <div class="manga-stats">
                                    <span class="popular">热度: -</span>
                                    <span class="rise">-</span>
                                </div>
                            </div>
                        </template>
                    </a-card>
                </a-col>
            </a-row>
        </a-spin>

        <!-- 加载更多 -->
        <div v-if="hasMore && !isLoading" class="load-more-container" @mouseenter="loadMore">
            <div class="load-more-text" :class="{ 'loading': isLoading }">
                {{ isLoading ? '加载中...' : '加载更多' }}
            </div>
        </div>
        <div v-else-if="rankingList.length > 0" class="load-more-container">
            <div class="load-more-text no-more">没有更多了</div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMangaRankingStore } from '../../stores/manga-ranking'
import { formatNumber } from '../../utils/number'

const router = useRouter()
const rankingStore = useMangaRankingStore()

// 状态管理
const contentType = ref(rankingStore.currentType)
const dateType = ref(rankingStore.currentDateType)
const audienceType = ref(rankingStore.currentAudienceType)

// 计算属性
const rankingList = computed(() => rankingStore.rankingList)
const isLoading = computed(() => rankingStore.isLoading)
const hasMore = computed(() => {
    const pagination = rankingStore.pagination
    return pagination.offset + pagination.limit < pagination.total
})

// 处理内容类型切换
const handleContentTypeChange = (type) => {
    contentType.value = type
    rankingStore.setType(type)
}

// 处理时间类型切换
const handleDateTypeChange = (type) => {
    dateType.value = type
    rankingStore.setDateType(type)
}

// 处理受众类型切换
const handleAudienceTypeChange = (type) => {
    audienceType.value = type
    rankingStore.setAudienceType(type)
}

// 加载更多
const loadMore = () => {
    if (!isLoading.value) {
        rankingStore.loadMore()
    }
}

// 处理项目点击，跳转到详情页
const handleItemClick = (item) => {
    if (contentType.value === 1 && item.comic) {
        // 漫画详情页
        router.push({
            name: 'MangaDetail',
            params: { pathWord: item.comic.path_word }
        })
    } else if (contentType.value === 5 && item.book) {
        // 轻小说详情页
        router.push({
            name: 'BookDetail',
            params: { pathWord: item.book.path_word }
        })
    }
}

// 监听参数变化，确保同步
watch(() => rankingStore.currentType, (newValue) => {
    contentType.value = newValue
})

watch(() => rankingStore.currentDateType, (newValue) => {
    dateType.value = newValue
})

watch(() => rankingStore.currentAudienceType, (newValue) => {
    audienceType.value = newValue
})

// 组件挂载时加载数据
onMounted(() => {
    // 每次打开页面都重新获取最新数据
    rankingStore.fetchRankingData()
})
</script>

<style scoped src="../../assets/styles/manga-ranking.scss" lang="scss"></style>