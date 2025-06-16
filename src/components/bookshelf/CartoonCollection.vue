<template>
    <div class="cartoon-collection">
        <!-- 操作栏 -->
        <div class="collection-controls" v-if="(!loading && !internalLoading) || cartoonList.length > 0">
            <div class="controls-left">
                <a-select v-model:value="ordering" @change="onOrderingChange" style="width: 180px;"
                    :disabled="internalLoading">
                    <a-select-option value="-datetime_updated">按动画更新时间排序</a-select-option>
                    <a-select-option value="-datetime_modifier">按加入书架时间排序</a-select-option>
                    <a-select-option value="-datetime_browse">按观看时间排序</a-select-option>
                </a-select>
            </div>
            <div class="controls-right">
                <span class="total-info">共收藏 {{ totalCount }} 部动画</span>
            </div>
        </div>

        <!-- 错误信息 -->
        <a-alert v-if="error" type="error" :message="error" show-icon banner style="margin-bottom: 20px" /> <!-- 空状态 -->
        <a-empty v-if="!loading && !internalLoading && !error && cartoonList.length === 0" description="您还没有收藏任何动画">
            <a-button type="primary" @click="$router.push('/cartoons')">去动画首页看看</a-button>
        </a-empty>

        <!-- 骨架屏加载状态 -->
        <div v-if="loading || internalLoading" class="cartoon-grid">
            <a-card v-for="n in 8" :key="n" class="cartoon-card skeleton-card">
                <a-skeleton :loading="true" active :paragraph="{ rows: 2 }">
                    <template #avatar>
                        <div class="skeleton-cover"></div>
                    </template>
                </a-skeleton>
            </a-card>
        </div>

        <!-- 实际内容 -->
        <div v-else-if="!error && cartoonList.length > 0">
            <div class="cartoon-grid">
                <a-card v-for="item in cartoonList" :key="item.uuid || item.id" hoverable class="cartoon-card"
                    @click="goToCartoon(item)">
                    <div class="cartoon-cover">
                        <img :src="item.cartoon.cover" :alt="item.cartoon.name" />
                        <a-badge
                            v-if="item.last_browse && item.last_browse.last_browse_name && item.cartoon.last_chapter && item.last_browse.last_browse_name !== item.cartoon.last_chapter.name"
                            count="有更新"
                            style="position: absolute; top: 8px; right: 8px; z-index: 2; background: #ff4d4f; color: #fff; font-size: 12px; border-radius: 8px; padding: 0 8px;" />
                    </div>
                    <a-card-meta :title="item.cartoon.name" style="margin-top: 5px;">
                        <template #description>
                            <div class="cartoon-company" v-if="item.cartoon.company">
                                {{ item.cartoon.company.name }}
                            </div>
                            <div class="last-watch" v-if="item.last_browse && item.last_browse.last_browse_name">
                                上次观看: {{ item.last_browse.last_browse_name }}
                            </div>
                            <div class="cartoon-update" v-if="item.cartoon.last_chapter_name">
                                最新: {{ item.cartoon.last_chapter_name }}
                            </div>
                            <div class="update-time" v-if="item.cartoon.datetime_updated">
                                更新于: {{ formatDate(item.cartoon.datetime_updated) }}
                            </div>
                        </template>
                    </a-card-meta>
                </a-card>
            </div>

            <!-- 分页 -->
            <div class="pagination-container" v-if="totalCount > pageSize">
                <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="totalCount"
                    @change="onPageChange" @show-size-change="onPageSizeChange"
                    :page-size-options="['12', '18', '24', '36']" show-size-changer show-quick-jumper
                    :show-total="(total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useCartoonCollectionStore } from '../../stores/cartoon-collection'
import { formatDate } from '../../utils/date'

const router = useRouter()
const emit = defineEmits(['update-count', 'update-time'])
const cartoonCollectionStore = useCartoonCollectionStore()

// 响应式数据
const cartoonList = ref([])
const loading = ref(false)
const internalLoading = ref(false)
const error = ref('')
const currentPage = ref(1)
const pageSize = ref(18)
const totalCount = ref(0)
const ordering = ref('-datetime_modifier')

// Props
const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    }
})

// 获取收藏的动画列表
const fetchCartoonList = async (forceRefresh = false) => {
    if (props.loading) return

    internalLoading.value = true
    error.value = ''

    const options = {
        page: currentPage.value,
        pageSize: pageSize.value,
        ordering: ordering.value
    }

    cartoonCollectionStore.fetchCartoonCollection(options, forceRefresh).then(result => {
        if (result.success) {
            cartoonList.value = result.data || []
            totalCount.value = result.total || 0

            if (!result.fromCache) {
                const currentTime = new Date().toISOString()
                emit('update-time', currentTime)
                if (forceRefresh) {
                    message.success('动画收藏列表已刷新')
                }
            } else if (result.fromCache && cartoonCollectionStore.lastUpdateTime) {
                // 如果是从缓存加载，发送store中的更新时间
                const lastTime = new Date(cartoonCollectionStore.lastUpdateTime).toISOString()
                emit('update-time', lastTime)
            }

            // 通知父组件更新数量
            emit('update-count', totalCount.value)

            // 预加载下一页
            cartoonCollectionStore.preloadNextPage(currentPage.value, pageSize.value, ordering.value)
        } else {
            error.value = result.error?.message || '获取动画收藏列表失败'
            message.error(error.value)
        }
    }).catch(err => {
        console.error('获取动画收藏列表失败:', err)
        error.value = err.message || '获取动画收藏列表失败'
        message.error(error.value)
    }).finally(() => {
        internalLoading.value = false
    })
}

// 处理排序改变
const onOrderingChange = (value) => {
    ordering.value = value
    currentPage.value = 1
    fetchCartoonList(true) // 强制刷新
}

// 处理页码改变
const onPageChange = (page, size) => {
    currentPage.value = page
    pageSize.value = size
    fetchCartoonList()
}

// 处理页大小改变
const onPageSizeChange = (current, size) => {
    currentPage.value = 1
    pageSize.value = size
    fetchCartoonList(true) // 强制刷新
}

// 跳转到动画详情
const goToCartoon = (item) => {
    if (item.cartoon && item.cartoon.path_word) {
        router.push(`/cartoon/${item.cartoon.path_word}`)
    }
}

// 刷新数据
const refresh = () => {
    currentPage.value = 1
    fetchCartoonList(true) // 强制刷新缓存
}

// 监听外部loading状态
watch(() => props.loading, (newLoading) => {
    if (!newLoading) {
        fetchCartoonList()
    }
})

// 组件挂载
onMounted(() => {
    if (!props.loading) {
        fetchCartoonList()
    }
})

// 暴露方法给父组件
defineExpose({
    refresh
})
</script>

<style scoped src="../../assets/styles/cartoon-collection.scss" lang="scss"></style>
