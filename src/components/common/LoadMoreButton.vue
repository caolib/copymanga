<template>
    <div class="load-more">
        <!-- 有更多数据且未加载中 -->
        <a-button v-if="hasMore && !loading" type="primary" @mouseenter="handleMouseEnter" @click="handleClick"
            :loading="loading" block>
            加载更多
        </a-button>

        <!-- 加载中状态 -->
        <a-button v-else-if="loading" type="primary" :loading="true" block>
            加载中...
        </a-button>

        <!-- 没有更多数据 -->
        <a-button v-else-if="!hasMore && showNoMore" disabled block>
            没有更多了
        </a-button>
    </div>
</template>

<script setup>
const props = defineProps({
    hasMore: {
        type: Boolean,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    showNoMore: {
        type: Boolean,
        default: true
    },
    triggerMode: {
        type: String,
        default: 'hover', // 'hover' 或 'click'
        validator: (value) => ['hover', 'click'].includes(value)
    }
})

const emit = defineEmits(['load-more'])

// 加载更多处理函数（带防抖）
let loadMoreTimer = null
const handleLoadMore = () => {
    // 防止在加载中或没有更多数据时触发
    if (props.loading || !props.hasMore) {
        return
    }

    if (loadMoreTimer) {
        clearTimeout(loadMoreTimer)
    }

    loadMoreTimer = setTimeout(() => {
        emit('load-more')
    }, 300)
}

// 鼠标悬停处理
const handleMouseEnter = () => {
    if (props.triggerMode === 'hover') {
        handleLoadMore()
    }
}

// 点击处理
const handleClick = () => {
    if (props.triggerMode === 'click') {
        handleLoadMore()
    }
}
</script>

<style scoped>
.load-more {
    margin: 20px 0;
    text-align: center;
}
</style>
