<template>
    <div ref="containerRef" :class="['lazy-img-container', { 'loaded': loaded }]"
        :style="{ height: loaded ? 'auto' : `${placeholderHeight}px` }" :data-page="pageNumber">
        <!-- 加载状态骨架屏 -->
        <div v-if="!loaded && !error" class="img-placeholder">
            <a-skeleton-image active :style="{ width: '100%', height: '100%' }" />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-placeholder">
            <div class="error-content">
                <a-button @click="retryLoad" size="small" type="primary">重试</a-button>
            </div>
        </div> <!-- 实际图片 -->
        <div v-else :class="[
            'img-with-mask',
            { 'use-overlay': useOverlayMask }
        ]" :style="{ '--dark-mask-opacity': isDarkMode ? darkImageMaskOpacity : 0 }">
            <img :src="src" :alt="`第 ${pageNumber} 页`" class="manga-img" @error="handleImageError"
                @load="handleImageLoad" />
            <!-- 页码标志 -->
            <div class="page-number">{{ pageNumber }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
    src: {
        type: String,
        required: true
    },
    pageNumber: {
        type: Number,
        required: true
    }, imageSize: {
        type: Number,
        default: 100
    },
    isDarkMode: {
        type: Boolean,
        default: false
    }, darkImageMaskOpacity: {
        type: Number,
        default: 0.8
    }, placeholderHeight: {
        type: Number,
        default: 672
    },
    useOverlayMask: {
        type: Boolean,
        default: false
    }
})

// 组件状态
const containerRef = ref(null)
const loaded = ref(false)
const error = ref(false)

let observer = null

// 初始化 Intersection Observer
const initObserver = () => {
    if (typeof window === 'undefined') return

    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !loaded.value && !error.value) {
                    loadImage()
                    // 一旦开始加载，就停止观察
                    if (observer) {
                        observer.unobserve(entry.target)
                    }
                }
            })
        },
        {
            // 提前 200px 开始加载
            rootMargin: '200px 0px',
            threshold: 0.01
        }
    )

    if (containerRef.value) {
        observer.observe(containerRef.value)
    }
}

// 加载图片
const loadImage = () => {
    if (loaded.value || error.value) return

    const img = new Image()

    img.onload = () => {
        loaded.value = true
        error.value = false
    }

    img.onerror = () => {
        error.value = true
        loaded.value = false
        console.error(`Failed to load image for page ${props.pageNumber}:`, props.src)
    }

    img.src = props.src
}

// 处理图片加载成功
const handleImageLoad = () => {
    // 图片加载成功的处理
}

// 处理图片加载错误
const handleImageError = () => {
    error.value = true
    loaded.value = false
    console.error(`Image load error for page ${props.pageNumber}:`, props.src)
}

// 重试加载
const retryLoad = () => {
    error.value = false
    loaded.value = false
    loadImage()
}

// 生命周期
onMounted(() => {
    setTimeout(() => {
        initObserver()
    }, 100)
})

onUnmounted(() => {
    if (observer) {
        observer.disconnect()
    }
})
</script>

<style scoped src="../assets/styles/lazy-img.scss" lang="scss"></style>
