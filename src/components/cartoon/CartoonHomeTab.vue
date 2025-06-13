<template>
    <div class="cartoon-home-tab">
        <!-- 排序和筛选 -->
        <div class="filter-section">
            <a-row :gutter="16" align="middle">
                <a-col :span="12">
                    <a-select v-model:value="ordering" placeholder="排序方式" style="width: 200px;" @change="resetAndLoad">
                        <a-select-option value="-datetime_updated">最新</a-select-option>
                        <a-select-option value="-popular">热度</a-select-option>
                    </a-select>
                </a-col> <a-col :span="12" style="text-align: right;">
                    <a-button @click="refreshCartoons" :loading="loading" type="primary">
                        刷新
                    </a-button>
                </a-col>
            </a-row>
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useCartoonStore } from '../../stores/cartoon'
import { formatDate } from '../../utils/date'
import { formatNumber } from '../../utils/number'

const router = useRouter()
const cartoonStore = useCartoonStore()

const ordering = ref('-datetime_updated')
const limit = ref(18)

// 从store获取数据
const cartoons = computed(() => cartoonStore.getCartoonList(ordering.value).list)
const total = computed(() => cartoonStore.getCartoonList(ordering.value).total)
const hasMore = computed(() => cartoonStore.getCartoonList(ordering.value).hasMore)
const nextOffset = computed(() => cartoonStore.getCartoonList(ordering.value).nextOffset)

const loading = computed(() => cartoonStore.isLoading)
const loadingMore = computed(() => cartoonStore.isLoadingMore)

const loadCartoons = (isLoadMore = false) => {
    const offset = isLoadMore ? nextOffset.value : 0

    cartoonStore.fetchCartoonHome(ordering.value, limit.value, offset, !isLoadMore).then(result => {
        if (!result.success && result.error) {
            message.error(result.error.message || '获取动画列表失败')
        } else if (result.fromCache) {
            console.log('从缓存加载动画数据')
        }
    })
}

const loadMore = () => {
    if (!hasMore.value || loadingMore.value) return
    loadCartoons(true)
}

// 刷新数据
const refreshCartoons = () => {
    loading.value = true
    cartoonStore.fetchCartoonHome(ordering.value, limit.value, 0, true).finally(() => {
        loading.value = false
    })
}

const resetAndLoad = () => {
    loadCartoons(false)
}

const goToDetail = (pathWord) => {
    router.push(`/cartoon/${pathWord}`)
}

// 监听排序方式变化
watch(ordering, () => {
    loadCartoons(false)
})

onMounted(() => {
    loadCartoons(false)
})
</script>

<style lang="scss" src="../../assets/styles/cartoon-home-tab.scss" scoped></style>
