<template>
    <div class="book-text-reader">
        <!-- 工具栏 -->
        <div class="toolbar">
            <a-button type="text" @click="goBack" :icon="h(ArrowLeftOutlined)">
                返回
            </a-button>
        </div> <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <a-skeleton active :paragraph="{ rows: 20 }" />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
            <a-result status="error" :title="error">
                <template #extra>
                    <a-button type="primary" @click="loadTextContent">重试</a-button>
                </template>
            </a-result>
        </div> <!-- 文本内容 -->
        <div v-else class="reader-content">
            <div class="text-content">
                <a-typography-paragraph v-for="(line, index) in textLines" :key="index" class="text-line"
                    :class="{ 'empty-line': !line.trim() }">
                    {{ line || '\u00A0' }}
                </a-typography-paragraph>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, h, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { getBookTextContent } from '@/api/book'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(true)
const error = ref('')
const textContent = ref('')

// 计算属性：将文本按行分割
const textLines = computed(() => {
    if (!textContent.value) return []
    return textContent.value.split('\n')
})

// 返回上一页
const goBack = () => {
    router.back()
}

// 加载文本内容
const loadTextContent = async () => {
    try {
        loading.value = true
        error.value = ''
        const txtAddr = route.query.txtAddr
        // 获取文本内容
        const content = await getBookTextContent(txtAddr)
        textContent.value = content.data
        console.log('加载文本内容成功:', content)
    } catch (err) {
        console.error('加载文本内容失败:', err)
        error.value = err.message || '加载文本内容失败'
        message.error('加载文本内容失败')
    } finally {
        loading.value = false
    }
}

// 组件挂载时加载文本
onMounted(() => {
    loadTextContent()
})
</script>

<style scoped src="../assets/styles/book-text-reader-view.scss" lang="scss"></style>