<template>
    <div class="post-ranking-tab">
        <!-- 头部操作区 -->
        <div class="ranking-header">
            <div class="header-actions">
                <a-button type="primary" size="small" :loading="refreshLoading" @click="refreshAllData">
                    刷新全部
                </a-button>
                <span v-if="rankingStore.lastUpdateTime" class="update-time">
                    上次更新: {{ formatDate(rankingStore.lastUpdateTime) }}
                </span>
            </div>
        </div>

        <!-- 排行榜选项卡 -->
        <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
            <!-- 周排行榜 -->
            <a-tab-pane key="week" tab="周排行榜">
                <RankingList :data="weekRanking.list" :total="weekRanking.total" :loading="weekRanking.loading"
                    :error="weekRanking.error" :current-page="weekPageConfig.current" :page-size="weekPageConfig.size"
                    @page-change="(page, size) => handlePageChange('week', page, size)"
                    @refresh="() => handleRefresh('week')" />
            </a-tab-pane>

            <!-- 月排行榜 -->
            <a-tab-pane key="month" tab="月排行榜">
                <RankingList :data="monthRanking.list" :total="monthRanking.total" :loading="monthRanking.loading"
                    :error="monthRanking.error" :current-page="monthPageConfig.current"
                    :page-size="monthPageConfig.size"
                    @page-change="(page, size) => handlePageChange('month', page, size)"
                    @refresh="() => handleRefresh('month')" />
            </a-tab-pane>

            <!-- 总排行榜 -->
            <a-tab-pane key="total" tab="总排行榜">
                <RankingList :data="totalRanking.list" :total="totalRanking.total" :loading="totalRanking.loading"
                    :error="totalRanking.error" :current-page="totalPageConfig.current"
                    :page-size="totalPageConfig.size"
                    @page-change="(page, size) => handlePageChange('total', page, size)"
                    @refresh="() => handleRefresh('total')" />
            </a-tab-pane>
        </a-tabs>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePostRankingStore } from '../../stores/post-ranking'
import { formatDate } from '../../utils/date'
import RankingList from './RankingList.vue'

const rankingStore = usePostRankingStore()

// 状态变量
const activeTab = ref('week')
const refreshLoading = ref(false)

// 计算属性
const weekRanking = computed(() => rankingStore.getRankingData('week'))
const monthRanking = computed(() => rankingStore.getRankingData('month'))
const totalRanking = computed(() => rankingStore.getRankingData('total'))

const weekPageConfig = computed(() => rankingStore.getPageConfig('week'))
const monthPageConfig = computed(() => rankingStore.getPageConfig('month'))
const totalPageConfig = computed(() => rankingStore.getPageConfig('total'))

// 处理标签页切换
const handleTabChange = (key) => {
    activeTab.value = key
    // 如果该标签页没有数据，自动加载
    const rankingData = rankingStore.getRankingData(key)
    if (rankingData.list.length === 0 && !rankingData.loading) {
        loadTabData(key)
    }
}

// 加载指定标签页数据
const loadTabData = async (tabKey) => {
    const fetchMap = {
        'week': () => rankingStore.fetchWeekRanking(),
        'month': () => rankingStore.fetchMonthRanking(),
        'total': () => rankingStore.fetchTotalRanking()
    }

    const fetchFn = fetchMap[tabKey]
    if (fetchFn) {
        await fetchFn()
    }
}

// 处理分页变化
const handlePageChange = async (type, page, pageSize) => {
    const fetchMap = {
        'week': () => rankingStore.fetchWeekRanking(page, pageSize),
        'month': () => rankingStore.fetchMonthRanking(page, pageSize),
        'total': () => rankingStore.fetchTotalRanking(page, pageSize)
    }

    const fetchFn = fetchMap[type]
    if (fetchFn) {
        await fetchFn()
    }
}

// 处理单个排行榜刷新
const handleRefresh = async (type) => {
    const fetchMap = {
        'week': () => rankingStore.fetchWeekRanking(1, 18, true),
        'month': () => rankingStore.fetchMonthRanking(1, 18, true),
        'total': () => rankingStore.fetchTotalRanking(1, 18, true)
    }

    const fetchFn = fetchMap[type]
    if (fetchFn) {
        await fetchFn()
    }
}

// 刷新所有数据
const refreshAllData = async () => {
    refreshLoading.value = true
    await rankingStore.refreshAllRankings().finally(() => {
        refreshLoading.value = false
    })
}

// 组件挂载时加载当前标签页数据
onMounted(() => {
    loadTabData(activeTab.value)
})
</script>

<style scoped src="../../assets/styles/post-ranking.scss" lang="scss"></style>
