<template>
    <div class="reader-container" :class="{ 'dark-mode': isDarkMode }">
        <!-- 底部章节导航栏 - 固定在屏幕底部 -->
        <div class="bottom-navigation" :class="{ 'visible': showBottomNav }" @mouseenter="keepNavVisible"
            @mouseleave="hideNavAfterDelay">
            <div class="nav-content">
                <div class="reader-title">
                    <a-typography-title :level="4" style="margin: 0;">{{ chapterInfo.comic_name || '漫画标题'
                        }}</a-typography-title>
                    <a-typography-text type="secondary">{{ chapterInfo.name || '章节标题' }}</a-typography-text>
                </div>
                <div class="reader-controls">
                    <a-space>
                        <a-button @click="goBack" :icon="h(ArrowLeftOutlined)">
                            返回
                        </a-button>
                        <a-button @click="prevChapter" type="primary" :disabled="!hasPrevChapter"
                            :icon="h(LeftOutlined)">
                            上一话
                        </a-button>
                        <a-button @click="nextChapter" type="primary" :disabled="!hasNextChapter">
                            下一话
                            <RightOutlined />
                        </a-button>
                        <a-button @click="showSettingsDrawer = true" type="dashed" :icon="h(SettingOutlined)">
                            设置
                        </a-button>
                    </a-space>
                </div>
            </div>
        </div>

        <!-- 底部触发区域 -->
        <div class="bottom-trigger-area" @mouseenter="showNavigation"></div>

        <!-- 阅读器设置抽屉 -->
        <a-drawer title="阅读设置" :width="300" :visible="showSettingsDrawer" @close="showSettingsDrawer = false"
            :footer-style="{ textAlign: 'right' }" :class="{ 'dark-drawer': isDarkMode }" :mask="false">
            <a-form layout="vertical">
                <a-form-item label="漫画布局">
                    <a-radio-group v-model:value="readerConfig.layout">
                        <a-radio value="rtl">从右到左（日漫风格）</a-radio>
                        <a-radio value="ltr">从左到右</a-radio>
                    </a-radio-group>
                </a-form-item>

                <a-form-item label="每行列数">
                    <a-slider v-model:value="readerConfig.columnsPerRow" :min="1" :max="4" :step="1"
                        :marks="{ 1: '1列', 2: '2列', 3: '3列', 4: '4列' }" />
                </a-form-item>

                <a-form-item label="图片大小">
                    <a-slider v-model:value="readerConfig.imageSize" :min="50" :max="100" :step="10"
                        :marks="{ 50: '50%', 100: '100%' }" />
                </a-form-item>

                <a-form-item label="图片间距">
                    <a-slider v-model:value="readerConfig.imageGap" :min="0" :max="30" :step="1"
                        :marks="{ 0: '0px', 10: '10px', 30: '30px' }" />
                </a-form-item>

                <a-form-item label="暗色模式图片遮罩" v-if="isDarkMode">
                    <a-slider v-model:value="darkImageMaskOpacity" :min="0" :max="1" :step="0.1"
                        :marks="{ 0: '无遮罩', 0.5: '50%', 1: '完全遮罩' }" />
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        添加图片遮罩降低亮度以保护视力
                    </div>
                </a-form-item>
            </a-form>

            <template #footer>
                <a-button style="margin-right: 8px" @click="showSettingsDrawer = false">关闭</a-button>
                <a-button type="primary" @click="saveSettings">保存设置</a-button>
            </template>
        </a-drawer>

        <!-- 漫画图片区域 -->
        <div class="image-section">
            <div v-if="loading" class="loading">
                <a-spin tip="加载图片中..."></a-spin>
            </div>
            <div v-else-if="error" class="error">
                <a-result status="error" :title="error">
                    <template #extra>
                        <a-space>
                            <a-button type="primary" @click="fetchChapterImages" :icon="h(ReloadOutlined)">
                                重试加载图片
                            </a-button>
                            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)">
                                返回
                            </a-button>
                        </a-space>
                    </template>
                </a-result>
            </div>
            <div v-else class="reader">
                <div class="chapter-info" v-if="chapterInfo.datetime_created">
                    <span class="info-item">更新时间: {{ chapterInfo.datetime_created }}</span>
                    <span class="info-item">{{ chapterInfo.count }}页</span>
                </div>
                <div class="image-container" :style="{ gap: `${readerConfig.imageGap}px` }">
                    <!-- 动态列数和方向布局 -->
                    <a-row v-for="(chunk, rowIndex) in imageChunks" :key="rowIndex" :gutter="16"
                        :class="['manga-row', { 'row-rtl': readerConfig.layout === 'rtl', 'row-ltr': readerConfig.layout === 'ltr' }]"
                        justify="center" align="middle">
                        <template v-if="readerConfig.layout === 'rtl'">
                            <a-col :span="24 / readerConfig.columnsPerRow" class="manga-column"
                                v-for="(image, colIndex) in chunk" :key="colIndex"
                                :style="{ paddingLeft: `${readerConfig.imageGap / 2}px`, paddingRight: `${readerConfig.imageGap / 2}px` }">
                                <div v-if="!image.isPlaceholder" class="manga-image-wrapper"
                                    :style="{ width: `${readerConfig.imageSize}%` }">
                                    <img :src="image.url"
                                        :alt="`第${rowIndex * readerConfig.columnsPerRow + colIndex + 1}页`"
                                        class="manga-image" loading="lazy" />
                                    <div v-if="isDarkMode" class="dark-image-mask"
                                        :style="{ opacity: darkImageMaskOpacity }"></div>
                                </div>
                                <div v-else class="manga-image placeholder"></div>
                            </a-col>
                        </template>
                        <template v-else>
                            <a-col :span="24 / readerConfig.columnsPerRow" class="manga-column"
                                v-for="(image, colIndex) in chunk" :key="colIndex"
                                :style="{ paddingLeft: `${readerConfig.imageGap / 2}px`, paddingRight: `${readerConfig.imageGap / 2}px` }">
                                <div v-if="!image.isPlaceholder" class="manga-image-wrapper"
                                    :style="{ width: `${readerConfig.imageSize}%` }">
                                    <img :src="image.url"
                                        :alt="`第${rowIndex * readerConfig.columnsPerRow + colIndex + 1}页`"
                                        class="manga-image" loading="lazy" />
                                    <div v-if="isDarkMode" class="dark-image-mask"
                                        :style="{ opacity: darkImageMaskOpacity }"></div>
                                </div>
                                <div v-else class="manga-image placeholder"></div>
                            </a-col>
                        </template>
                    </a-row>
                </div>
                <div class="reader-footer">
                    <a-space>
                        <a-button @click="goBack" size="large" :icon="h(ArrowLeftOutlined)">
                            返回
                        </a-button>
                        <a-button @click="prevChapter" type="primary" :disabled="!hasPrevChapter" size="large"
                            :icon="h(LeftOutlined)">
                            上一话
                        </a-button>
                        <a-button @click="nextChapter" type="primary" :disabled="!hasNextChapter" size="large">
                            下一话
                            <RightOutlined />
                        </a-button>
                    </a-space>
                </div>
            </div>
        </div>

        <!-- 漫画评论区 -->
        <div class="comments-section">
            <a-divider>评论区({{ commentsTotal }})</a-divider>

            <!-- 评论输入框 -->
            <div class="comment-input-section" style="margin-bottom: 16px;">
                <a-textarea v-model:value="newComment" placeholder="这里是评论区，不是无人区..." :rows="1" :maxlength="500"
                    show-count style="margin-bottom: 8px;" />
                <div style="display: flex; justify-content: space-between; align-items: center;">

                    <a-button type="primary" @click="submitComment" :loading="submitCommentLoading"
                        :disabled="!newComment.trim() || !isLoggedIn" size="small">
                        发送
                    </a-button>
                </div>
            </div>
            <a-divider style="margin: 16px 0;" />

            <div v-if="commentsError" class="comments-error">
                <a-alert type="error" message="加载评论失败" :description="commentsError" />
                <a-button type="primary" @click="fetchComments(1)" style="margin-top: 8px;" :icon="h(ReloadOutlined)">
                    重试加载评论
                </a-button>
            </div>

            <a-spin :spinning="loadingComments" tip="加载评论中...">
                <div v-if="!commentsError && comments.length > 0" class="compact-comments-container">
                    <a-comment v-for="(item, index) in comments" :key="index" :author="item.user_name"
                        :avatar="item.user_avatar" :content="item.comment" :datetime="formatCommentTime(item.create_at)"
                        class="compact-comment-item" />
                </div>
                <a-empty v-else-if="!commentsError && comments.length === 0" description="暂无评论" />

                <!-- 评论分页 -->
                <div v-if="!commentsError && commentsTotal > commentsPageSize"
                    style="text-align: center; margin-top: 16px;">
                    <a-pagination v-model:current="commentsPage" :total="commentsTotal" :page-size="commentsPageSize"
                        :show-size-changer="false" :show-quick-jumper="true"
                        :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条评论`" size="small"
                        @change="handleCommentsPageChange" />
                </div>
            </a-spin>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, reactive, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    ArrowLeftOutlined,
    LeftOutlined,
    RightOutlined,
    SettingOutlined,
    ReloadOutlined
} from '@ant-design/icons-vue'
import { getChapterImages } from '../api/manga'
import { getChapterComments, postChapterComment } from '../api/comment'
import { useMangaStore } from '../stores/manga'
import { useThemeStore } from '../stores/theme'
import { useUserStore } from '../stores/user'
import { loadUIConfig, updateReaderConfig, DEFAULT_UI_CONFIG } from '@/config/ui-config'
import { formatDatetimeUpdated } from '../utils/date'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const mangaStore = useMangaStore() // 使用漫画存储
const themeStore = useThemeStore() // 使用主题存储
const userStore = useUserStore() // 使用用户存储
const chapterInfo = ref({})
const images = ref([])
const allChapters = ref([])
const currentChapterIndex = ref(-1)
const loading = ref(true)
const error = ref('')
const currentPrevChapterId = ref(null)
const currentNextChapterId = ref(null)

// 评论相关 - 独立状态管理
const comments = ref([])
const loadingComments = ref(false)
const commentsError = ref('') // 评论独立的错误状态
const commentsTotal = ref(0) // 评论总数
const commentsPage = ref(1) // 当前评论页码
const commentsPageSize = ref(100) // 每页评论数量

// 新评论相关状态
const newComment = ref('')
const submitCommentLoading = ref(false)

// 计算属性：检查用户是否已登录
const isLoggedIn = computed(() => userStore.isLoggedIn)

const showSettingsDrawer = ref(false); // 控制设置抽屉的显示
const readerConfig = reactive({ ...DEFAULT_UI_CONFIG.reader }); // 阅读器配置

// 底部导航栏显示控制
const showBottomNav = ref(false)
let hideNavTimer = null

// 添加暗色模式图片遮罩配置
const darkImageMaskOpacity = ref(0.8) // 暗色模式图片遮罩透明度，默认值提高

// 使用全局主题状态
const isDarkMode = computed(() => themeStore.isDarkMode)

// 滚动到顶部的工具函数
const scrollToTop = () => {
    // 首先尝试找到主内容滚动容器
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
        mainContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    } else {
        // 回退到window滚动
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        })
    }
}

// 计算属性：将图片分组，根据配置的每行列数
const imageChunks = computed(() => {
    const arr = [...images.value];
    const columnsPerRow = readerConfig.columnsPerRow;

    // 如果图片数量不能被列数整除，补充空白占位符
    const remainder = arr.length % columnsPerRow;
    if (remainder !== 0) {
        const placeholdersNeeded = columnsPerRow - remainder;
        for (let i = 0; i < placeholdersNeeded; i++) {
            arr.push({ url: '', isPlaceholder: true });
        }
    }

    // 按照列数分组
    const chunks = [];
    for (let i = 0; i < arr.length; i += columnsPerRow) {
        chunks.push(arr.slice(i, i + columnsPerRow));
    }
    return chunks;
})

// 计算属性：是否有上一章
const hasPrevChapter = computed(() => {
    // 首先检查API返回的上一章ID
    if (currentPrevChapterId.value !== null) return true;
    // 然后检查pinia中的章节信息
    return mangaStore.hasPrevChapter;
})

// 计算属性：是否有下一章
const hasNextChapter = computed(() => {
    // 首先检查API返回的下一章ID
    if (currentNextChapterId.value !== null) return true;
    // 然后检查pinia中的章节信息
    return mangaStore.hasNextChapter;
})

// 返回漫画详情页
const goBack = () => {
    router.push(`/manga/${mangaStore.pathWord || route.params.pathWord}`);
}

// 通用章节导航函数
const navigateToChapter = (direction) => {
    const isNext = direction === 'next'
    const hasChapter = isNext ? hasNextChapter.value : hasPrevChapter.value
    const apiChapterId = isNext ? currentNextChapterId.value : currentPrevChapterId.value
    const indexOffset = isNext ? 1 : -1
    const storeHasChapter = isNext ? mangaStore.hasNextChapter : mangaStore.hasPrevChapter

    if (!hasChapter) return

    // 如果有API返回的章节ID，优先使用
    if (apiChapterId) {
        const targetIndex = mangaStore.findChapterIndex(apiChapterId)
        if (targetIndex !== -1) {
            mangaStore.setCurrentChapterIndex(targetIndex)
        }

        router.push({
            name: 'ChapterReader',
            params: {
                pathWord: mangaStore.pathWord || route.params.pathWord,
                chapterId: apiChapterId
            }
        })
    } else if (storeHasChapter) {
        // 使用pinia中的章节信息
        const targetIndex = mangaStore.currentChapterIndex + indexOffset
        const targetChapter = mangaStore.currentChapters[targetIndex]

        mangaStore.setCurrentChapterIndex(targetIndex)
        router.push({
            name: 'ChapterReader',
            params: {
                pathWord: mangaStore.pathWord,
                chapterId: targetChapter.id
            }
        })
    }
}

// 跳转到上一章
const prevChapter = () => navigateToChapter('prev')

// 跳转到下一章
const nextChapter = () => navigateToChapter('next')

// 底部导航栏控制方法
const showNavigation = () => {
    // console.log('鼠标进入底部触发区域')
    showBottomNav.value = true
    // 清除之前的隐藏定时器
    if (hideNavTimer) {
        clearTimeout(hideNavTimer)
        hideNavTimer = null
    }
}

const hideNavAfterDelay = () => {
    // 清除之前的定时器
    if (hideNavTimer) {
        clearTimeout(hideNavTimer)
        hideNavTimer = null
    }

    // 1秒后隐藏导航栏
    hideNavTimer = setTimeout(() => {
        showBottomNav.value = false
        hideNavTimer = null
    }, 1000)
}

const keepNavVisible = () => {
    // 鼠标进入导航栏时，清除隐藏定时器
    if (hideNavTimer) {
        clearTimeout(hideNavTimer)
        hideNavTimer = null
    }
}

// 获取章节图片数据 - 独立加载流程
const fetchChapterImages = () => {
    loading.value = true
    error.value = ''

    // 从Pinia中获取章节信息，并更新本地状态
    if (mangaStore.currentChapters.length > 0) {
        allChapters.value = mangaStore.currentChapters

        // 根据当前章节ID查找索引
        if (route.params.chapterId) {
            const index = mangaStore.findChapterIndex(route.params.chapterId)
            if (index !== -1) {
                currentChapterIndex.value = index
                // 同步更新Pinia中的当前章节索引
                mangaStore.setCurrentChapterIndex(index)
            }
        } else {
            currentChapterIndex.value = mangaStore.currentChapterIndex
        }
    }

    getChapterImages(route.params.pathWord, route.params.chapterId)
        .then(response => {
            if (response && response.code === 200 && response.results) {
                const chapterData = response.results.chapter
                const comicData = response.results.comic                // 保存章节相关信息
                chapterInfo.value = {
                    comic_name: comicData.name,
                    name: chapterData.name,
                    datetime_created: chapterData.datetime_created,
                    count: chapterData.size || chapterData.contents.length
                }

                // 保存导航相关ID
                currentPrevChapterId.value = chapterData.prev
                currentNextChapterId.value = chapterData.next

                // 如果pinia中的漫画名称为空，则更新
                if (mangaStore.currentManga === null || !mangaStore.currentManga.name) {
                    mangaStore.setCurrentManga({
                        name: comicData.name,
                        pathWord: route.params.pathWord
                    })
                }

                // 将当前章节ID对应的索引更新到pinia
                const chapterId = route.params.chapterId
                if (chapterId) {
                    const index = mangaStore.findChapterIndex(chapterId)
                    if (index !== -1 && index !== mangaStore.currentChapterIndex) {
                        mangaStore.setCurrentChapterIndex(index)
                    }
                }

                // 保存图片数据
                images.value = chapterData.contents.map(image => {
                    // 直接使用原始URL
                    return {
                        url: image.url
                    };
                });
            } else {
                throw new Error('获取章节图片失败')
            }
        })
        .catch(err => {
            console.error('获取章节图片失败', err)
            error.value = '获取章节图片失败，请稍后重试'
        })
        .finally(() => {
            loading.value = false
            // 首次加载时滚动到顶部
            if (!route.params.chapterId || !images.value.length) {
                scrollToTop()
            }
        })
}

// 格式化评论时间 - 使用统一的日期格式化函数
const formatCommentTime = (timeStr) => {
    return formatDatetimeUpdated(timeStr)
}

// 获取章节评论
const fetchComments = (page = 1) => {
    if (!route.params.chapterId) return

    loadingComments.value = true
    commentsError.value = '' // 重置错误状态
    const offset = (page - 1) * commentsPageSize.value

    getChapterComments(route.params.chapterId, commentsPageSize.value, offset).then(response => {
        if (response && response.code === 200 && response.results) {
            comments.value = response.results.list || []
            commentsTotal.value = response.results.total || 0
            commentsPage.value = page
        } else {
            throw new Error('获取评论数据失败')
        }
    }).catch(error => {
        console.error('获取评论失败', error)
        commentsError.value = '获取评论失败，请点击重试按钮重新加载'
    }).finally(() => {
        loadingComments.value = false
    })
}

// 发送章节评论
const submitComment = () => {
    if (!newComment.value.trim()) {
        message.warning('请输入评论内容')
        return
    }

    if (!isLoggedIn.value) {
        message.warning('请先登录')
        return
    }

    if (!route.params.chapterId) {
        message.error('章节信息不完整')
        return
    }

    submitCommentLoading.value = true

    postChapterComment(route.params.chapterId, newComment.value.trim()).then(res => {
        message.success('评论发表成功')
        newComment.value = ''
        // 刷新评论列表，回到第一页
        fetchComments(1)
    }).catch(error => {
        console.error('发表评论失败:', error)
        message.error(error.message || '发表评论失败')
    }).finally(() => {
        submitCommentLoading.value = false
    })
}

// 处理评论分页
const handleCommentsPageChange = (page) => {
    fetchComments(page)
}

// 配置管理方法
const loadSettings = async () => {
    try {
        const config = await loadUIConfig()
        Object.assign(readerConfig, config.reader)
        // 加载暗色模式图片遮罩配置
        darkImageMaskOpacity.value = config.theme?.darkImageMask || 0.8
        // console.log('UI配置加载成功:', config)
    } catch (error) {
        console.error('加载UI配置失败:', error)
        message.error('加载配置失败')
    }
}

const saveSettings = async () => {
    try {
        // 先保存阅读器配置
        const readerSuccess = await updateReaderConfig(readerConfig)

        // 再保存暗色模式图片遮罩配置
        const { updateThemeConfig } = await import('@/config/ui-config')
        const themeSuccess = await updateThemeConfig({
            darkImageMask: darkImageMaskOpacity.value
        })

        if (readerSuccess && themeSuccess) {
            console.log('UI配置保存成功')
            message.success('配置保存成功')
            showSettingsDrawer.value = false // 保存成功后关闭抽屉
        } else {
            message.error('配置保存失败')
        }
        return readerSuccess && themeSuccess
    } catch (error) {
        console.error('保存UI配置失败:', error)
        message.error('配置保存失败')
        return false
    }
}

onMounted(() => {
    // 获取漫画图片
    fetchChapterImages()

    // 短暂延迟后再加载评论，避免两个请求同时发出导致的性能问题
    setTimeout(() => {
        fetchComments(1)
    }, 300)

    // 加载用户配置
    loadSettings()

    // 初始显示底部导航栏，1秒后自动隐藏
    showBottomNav.value = true
    hideNavAfterDelay()
})

// 监听路由参数 chapterId 的变化 - 完全独立的两个监听器
// 监听器1：章节ID变化时更新漫画图片
watch(() => route.params.chapterId, (newChapterId, oldChapterId) => {
    if (newChapterId && newChapterId !== oldChapterId) {
        // 立即滚动到顶部，以便用户看到新章节的开头
        scrollToTop('smooth')

        // 仅更新图片部分
        fetchChapterImages()

        // 显示底部导航栏，1秒后自动隐藏
        showBottomNav.value = true
        hideNavAfterDelay()
    }
}, { immediate: false })

// 监听器2：章节ID变化时更新评论
watch(() => route.params.chapterId, (newChapterId, oldChapterId) => {
    if (newChapterId && newChapterId !== oldChapterId) {
        // 重置评论分页到第一页
        commentsPage.value = 1
        // 延迟加载评论，优先处理图片加载
        setTimeout(() => {
            fetchComments(1)
        }, 500)
    }
}, { immediate: false })

</script>

<style src='../assets/styles/chapter-reader.scss' scoped></style>
