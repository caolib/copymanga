<template>
    <div class="book-reader-container" :class="{ 'dark-mode': isDarkMode }">
        <!-- 顶部导航栏 -->
        <div class="reader-header" :class="{ 'visible': showHeader }" @mouseenter="keepHeaderVisible"
            @mouseleave="hideHeaderAfterDelay">
            <div class="header-content">
                <div class="reader-title">
                    <h3>{{ chapterInfo.book_name || '轻小说' }}</h3>
                    <h4>{{ chapterInfo.name || '章节标题' }}</h4>
                </div>
                <div class="reader-controls">
                    <a-button @click="goBack" type="default">返回</a-button>
                    <a-button @click="prevChapter" :disabled="!hasPrevChapter" type="default">上一章</a-button>
                    <a-button @click="nextChapter" :disabled="!hasNextChapter" type="primary">下一章</a-button>
                    <a-button @click="showSettingsDrawer = true" type="default">设置</a-button>
                </div>
            </div>
        </div>

        <!-- 顶部触发区域 -->
        <div class="top-trigger-area" @mouseenter="showNavigation"></div>

        <!-- 主要内容区域 -->
        <div class="reader-content" @mousemove="handleMouseMove">
            <a-spin :spinning="loading" tip="加载中..." size="large">
                <!-- 错误提示 -->
                <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />

                <!-- 章节内容 -->
                <div v-if="chapterContent && !loading" class="chapter-content">
                    <div class="chapter-header">
                        <h1 class="chapter-title">{{ chapterInfo.name }}</h1>
                        <div class="chapter-meta">
                            <span class="book-name">{{ chapterInfo.book_name }}</span>
                            <span class="chapter-date" v-if="chapterInfo.datetime_created">
                                {{ formatDate(chapterInfo.datetime_created) }}
                            </span>
                        </div>
                    </div>

                    <!-- 文本内容 -->
                    <div class="text-content" :style="readerStyles">
                        <div v-for="(paragraph, index) in formattedContent" :key="index" class="paragraph"
                            v-html="paragraph"></div>
                    </div>

                    <!-- 章节导航 -->
                    <div class="chapter-navigation">
                        <a-button @click="prevChapter" :disabled="!hasPrevChapter" size="large" type="default">
                            上一章
                        </a-button>
                        <a-button @click="nextChapter" :disabled="!hasNextChapter" size="large" type="primary">
                            下一章
                        </a-button>
                    </div>
                </div>
            </a-spin>
        </div>

        <!-- 阅读器设置抽屉 -->
        <a-drawer title="阅读设置" :width="300" v-model:open="showSettingsDrawer" :class="{ 'dark-drawer': isDarkMode }">
            <a-form layout="vertical">
                <a-form-item label="字体大小">
                    <a-slider v-model:value="readerConfig.fontSize" :min="12" :max="24" :step="1"
                        :marks="{ 12: '12px', 16: '16px', 20: '20px', 24: '24px' }" />
                </a-form-item>

                <a-form-item label="行间距">
                    <a-slider v-model:value="readerConfig.lineHeight" :min="1.2" :max="2.0" :step="0.1"
                        :marks="{ 1.2: '1.2', 1.5: '1.5', 1.8: '1.8', 2.0: '2.0' }" />
                </a-form-item>

                <a-form-item label="段落间距">
                    <a-slider v-model:value="readerConfig.paragraphSpacing" :min="8" :max="32" :step="4"
                        :marks="{ 8: '8px', 16: '16px', 24: '24px', 32: '32px' }" />
                </a-form-item>

                <a-form-item label="内容宽度">
                    <a-slider v-model:value="readerConfig.contentWidth" :min="60" :max="100" :step="5"
                        :marks="{ 60: '60%', 80: '80%', 100: '100%' }" />
                </a-form-item>

                <a-form-item label="背景颜色" v-if="!isDarkMode">
                    <a-radio-group v-model:value="readerConfig.backgroundColor" button-style="solid">
                        <a-radio-button value="#ffffff">白色</a-radio-button>
                        <a-radio-button value="#f7f3e9">护眼绿</a-radio-button>
                        <a-radio-button value="#e6ddd4">羊皮纸</a-radio-button>
                    </a-radio-group>
                </a-form-item>
            </a-form>

            <template #footer>
                <div style="text-align: right;">
                    <a-space>
                        <a-button @click="resetReaderSettings">恢复默认</a-button>
                        <a-button type="primary" @click="saveReaderSettings">保存设置</a-button>
                    </a-space>
                </div>
            </template>
        </a-drawer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getBookChapterContent, getBookChapters } from '@/api/book'
import { useThemeStore } from '@/stores/theme'
import { loadUIConfig, updateReaderConfig } from '@/config/ui-config'
import { formatDatetimeUpdated } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()

// 状态
const loading = ref(true)
const error = ref('')
const chapterContent = ref('')
const chapterInfo = ref({})
const chapters = ref([])
const currentChapterIndex = ref(-1)
const showHeader = ref(true)
const showSettingsDrawer = ref(false)

// 计算属性
const isDarkMode = computed(() => themeStore.isDarkMode)
const hasPrevChapter = computed(() => currentChapterIndex.value > 0)
const hasNextChapter = computed(() => currentChapterIndex.value < chapters.value.length - 1)

// 阅读器配置
const readerConfig = reactive({
    fontSize: 16,
    lineHeight: 1.6,
    paragraphSpacing: 16,
    contentWidth: 80,
    backgroundColor: '#ffffff'
})

// 计算样式
const readerStyles = computed(() => ({
    fontSize: `${readerConfig.fontSize}px`,
    lineHeight: readerConfig.lineHeight,
    maxWidth: `${readerConfig.contentWidth}%`,
    backgroundColor: isDarkMode.value ? '#1f1f1f' : readerConfig.backgroundColor,
    color: isDarkMode.value ? '#e8e8e8' : '#333'
}))

// 格式化内容
const formattedContent = computed(() => {
    if (!chapterContent.value) return []

    return chapterContent.value
        .split('\n')
        .filter(paragraph => paragraph.trim())
        .map(paragraph => paragraph.trim())
})

// 格式化日期
const formatDate = (dateString) => {
    if (!dateString) return '未知时间'
    try {
        return formatDatetimeUpdated(dateString)
    } catch (error) {
        return '未知时间'
    }
}

// 获取章节内容
const fetchChapterContent = async () => {
    try {
        loading.value = true
        error.value = ''

        const pathWord = route.params.pathWord
        const chapterId = route.params.chapterId

        if (!pathWord || !chapterId) {
            throw new Error('缺少必要参数')
        }

        const response = await getBookChapterContent(pathWord, chapterId)
        if (response && response.results) {
            chapterContent.value = response.results.content || ''
            chapterInfo.value = response.results.chapter || {}
        } else {
            throw new Error('获取章节内容失败')
        }
    } catch (err) {
        console.error('获取章节内容失败:', err)
        error.value = err.message || '获取章节内容失败'
    } finally {
        loading.value = false
    }
}

// 获取章节列表（用于导航）
const fetchChapterList = async () => {
    try {
        const pathWord = route.params.pathWord
        if (!pathWord) return

        const response = await getBookChapters(pathWord)
        if (response && response.results && response.results.list) {
            chapters.value = response.results.list

            // 找到当前章节的索引
            const chapterId = route.params.chapterId
            currentChapterIndex.value = chapters.value.findIndex(
                chapter => chapter.uuid === chapterId
            )
        }
    } catch (err) {
        console.error('获取章节列表失败:', err)
    }
}

// 导航功能
const goBack = () => {
    const pathWord = route.params.pathWord
    router.push(`/book/${pathWord}`)
}

const prevChapter = () => {
    if (hasPrevChapter.value) {
        const prevChapter = chapters.value[currentChapterIndex.value - 1]
        navigateToChapter(prevChapter.uuid)
    }
}

const nextChapter = () => {
    if (hasNextChapter.value) {
        const nextChapter = chapters.value[currentChapterIndex.value + 1]
        navigateToChapter(nextChapter.uuid)
    }
}

const navigateToChapter = (chapterId) => {
    const pathWord = route.params.pathWord
    router.push(`/book/${pathWord}/chapter/${chapterId}`)
}

// 界面控制
let hideTimer = null

const handleMouseMove = (event) => {
    // 鼠标在顶部区域时显示头部
    if (event.clientY < 100) {
        showNavigation()
    } else {
        hideHeaderAfterDelay()
    }
}

const showNavigation = () => {
    showHeader.value = true
    clearTimeout(hideTimer)
}

const keepHeaderVisible = () => {
    clearTimeout(hideTimer)
}

const hideHeaderAfterDelay = () => {
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
        showHeader.value = false
    }, 3000)
}

// 配置管理
const loadReaderSettings = async () => {
    try {
        const config = await loadUIConfig()
        if (config.bookReader) {
            Object.assign(readerConfig, config.bookReader)
        }
    } catch (error) {
        console.error('加载阅读设置失败:', error)
    }
}

const saveReaderSettings = async () => {
    try {
        await updateReaderConfig({
            bookReader: { ...readerConfig }
        })
        message.success('设置保存成功')
        showSettingsDrawer.value = false
    } catch (error) {
        console.error('保存阅读设置失败:', error)
        message.error('保存设置失败')
    }
}

const resetReaderSettings = () => {
    Object.assign(readerConfig, {
        fontSize: 16,
        lineHeight: 1.6,
        paragraphSpacing: 16,
        contentWidth: 80,
        backgroundColor: '#ffffff'
    })
    message.info('已恢复默认设置')
}

// 组件生命周期
onMounted(async () => {
    await loadReaderSettings()
    await fetchChapterList()
    await fetchChapterContent()

    // 初始显示头部，3秒后自动隐藏
    showHeader.value = true
    hideHeaderAfterDelay()
})

onUnmounted(() => {
    clearTimeout(hideTimer)
})
</script>

<style scoped>
.book-reader-container {
    min-height: 100vh;
    background-color: #f5f5f5;
    position: relative;
    transition: background-color 0.3s ease;
}

.book-reader-container.dark-mode {
    background-color: #1a1a1a;
    color: #e8e8e8;
}

.reader-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #e8e8e8;
    z-index: 1000;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    padding: 12px 20px;
}

.reader-header.visible {
    transform: translateY(0);
}

.dark-mode .reader-header {
    background: rgba(26, 26, 26, 0.95);
    border-bottom-color: #404040;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
}

.reader-title h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.reader-title h4 {
    margin: 4px 0 0 0;
    font-size: 14px;
    color: #666;
    font-weight: normal;
}

.dark-mode .reader-title h4 {
    color: #999;
}

.reader-controls {
    display: flex;
    gap: 8px;
}

.top-trigger-area {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    z-index: 999;
}

.reader-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    min-height: 100vh;
}

.chapter-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.dark-mode .chapter-content {
    background: #2a2a2a;
}

.chapter-header {
    padding: 32px 40px 24px;
    border-bottom: 1px solid #e8e8e8;
    text-align: center;
}

.dark-mode .chapter-header {
    border-bottom-color: #404040;
}

.chapter-title {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #1a1a1a;
}

.dark-mode .chapter-title {
    color: #e8e8e8;
}

.chapter-meta {
    display: flex;
    justify-content: center;
    gap: 20px;
    font-size: 14px;
    color: #666;
}

.dark-mode .chapter-meta {
    color: #999;
}

.text-content {
    padding: 40px;
    margin: 0 auto;
    line-height: 1.8;
    font-size: 16px;
    color: #333;
    transition: all 0.3s ease;
}

.dark-mode .text-content {
    color: #e8e8e8;
}

.paragraph {
    margin-bottom: 16px;
    text-indent: 2em;
    text-align: justify;
}

.chapter-navigation {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 32px 40px;
    border-top: 1px solid #e8e8e8;
}

.dark-mode .chapter-navigation {
    border-top-color: #404040;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .reader-content {
        padding: 20px 16px;
    }

    .header-content {
        flex-direction: column;
        gap: 12px;
        text-align: center;
    }

    .reader-controls {
        flex-wrap: wrap;
        justify-content: center;
    }

    .text-content {
        padding: 24px 20px;
        font-size: 15px;
    }

    .chapter-header {
        padding: 24px 20px 16px;
    }

    .chapter-title {
        font-size: 22px;
    }

    .chapter-navigation {
        padding: 24px 20px;
        flex-direction: column;
    }
}

/* 抽屉暗色模式 */
:deep(.dark-drawer .ant-drawer-content) {
    background-color: #2a2a2a;
    color: #e8e8e8;
}

:deep(.dark-drawer .ant-drawer-header) {
    background-color: #2a2a2a;
    border-bottom-color: #404040;
    color: #e8e8e8;
}

:deep(.dark-drawer .ant-drawer-body) {
    background-color: #2a2a2a;
}
</style>
