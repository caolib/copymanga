<template>
    <div class="reader-container" :class="{ 'dark-mode': isDarkMode }">
        <!-- 底部章节导航栏 - 固定在屏幕底部 -->
        <div class="bottom-navigation" :class="{ 'visible': showBottomNav }" @mouseenter="keepNavVisible"
            @mouseleave="hideNavAfterDelay">
            <div class="nav-content">
                <div class="reader-title">
                    <h3>{{ chapterInfo.comic_name || '漫画标题' }}</h3>
                    <h4>{{ chapterInfo.name || '章节标题' }}</h4>
                </div>
                <div class="reader-controls">
                    <button @click="goBack" class="control-button">返回</button>
                    <button @click="prevChapter" class="control-button" :disabled="!hasPrevChapter">上一话</button>
                    <button @click="nextChapter" class="control-button" :disabled="!hasNextChapter">下一话</button>
                    <button @click="showSettingsDrawer = true" class="control-button settings-button">
                        <span>设置</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 底部触发区域 -->
        <div class="bottom-trigger-area" @mouseenter="showNavigation"></div>

        <!-- 阅读器设置抽屉 -->
        <a-drawer title="阅读设置" :width="300" :visible="showSettingsDrawer" @close="showSettingsDrawer = false"
            :footer-style="{ textAlign: 'right' }" :class="{ 'dark-drawer': isDarkMode }">
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
                    <a-slider v-model:value="readerConfig.imageSize" :min="50" :max="150" :step="10"
                        :marks="{ 50: '50%', 100: '100%', 150: '150%' }" />
                </a-form-item>

                <a-form-item label="图片间距">
                    <a-slider v-model:value="readerConfig.imageGap" :min="0" :max="30" :step="1"
                        :marks="{ 0: '0px', 10: '10px', 30: '30px' }" />
                </a-form-item>

                <a-form-item label="暗色模式图片遮罩" v-if="isDarkMode">
                    <a-slider v-model:value="darkImageMaskOpacity" :min="0" :max="1" :step="0.1"
                        :marks="{ 0: '无遮罩', 0.3: '30%', 0.5: '50%', 1: '完全遮罩' }" />
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        调整暗色模式下图片遮罩的透明度，降低图片亮度以保护视力
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
                {{ error }}
                <div class="retry-container">
                    <button @click="fetchChapterImages" class="retry-button">重试加载图片</button>
                    <button @click="goBack" class="retry-button secondary">返回</button>
                </div>
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
                                <div v-if="!image.isPlaceholder" class="manga-image-wrapper">
                                    <img :src="image.url"
                                        :alt="`第${rowIndex * readerConfig.columnsPerRow + colIndex + 1}页`"
                                        class="manga-image" loading="lazy"
                                        :style="{ width: `${readerConfig.imageSize}%` }" />
                                    <div v-if="isDarkMode" class="dark-image-mask"
                                        :style="{ opacity: darkImageMaskOpacity }"></div>
                                </div>
                                <div v-else class="manga-image placeholder"></div>
                            </a-col>
                        </template>
                        <template v-else>
                            <a-col :span="24 / readerConfig.columnsPerRow" class="manga-column"
                                v-for="(image, colIndex) in [...chunk].reverse()" :key="colIndex"
                                :style="{ paddingLeft: `${readerConfig.imageGap / 2}px`, paddingRight: `${readerConfig.imageGap / 2}px` }">
                                <div v-if="!image.isPlaceholder" class="manga-image-wrapper">
                                    <img :src="image.url"
                                        :alt="`第${rowIndex * readerConfig.columnsPerRow + chunk.length - colIndex}页`"
                                        class="manga-image" loading="lazy"
                                        :style="{ width: `${readerConfig.imageSize}%` }" />
                                    <div v-if="isDarkMode" class="dark-image-mask"
                                        :style="{ opacity: darkImageMaskOpacity }"></div>
                                </div>
                                <div v-else class="manga-image placeholder"></div>
                            </a-col>
                        </template>
                    </a-row>
                </div>
                <div class="reader-footer">
                    <div class="reader-controls">
                        <button @click="prevChapter" class="control-button" :disabled="!hasPrevChapter">上一话</button>
                        <button @click="nextChapter" class="control-button" :disabled="!hasNextChapter">下一话</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 漫画评论区 -->
        <div class="comments-section">
            <a-divider>评论区({{ comments.length }})</a-divider>

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
                <a-button type="primary" @click="fetchComments" class="retry-comments-button">
                    重试加载评论
                </a-button>
            </div> <a-spin :spinning="loadingComments" tip="加载评论中...">
                <div v-if="!commentsError && comments.length > 0" class="compact-comments-container">
                    <a-comment v-for="(item, index) in comments" :key="index" :author="item.user_name"
                        :avatar="item.user_avatar" :content="item.comment" :datetime="formatCommentTime(item.create_at)"
                        class="compact-comment-item" />
                </div>
                <a-empty v-else-if="!commentsError && comments.length === 0" description="暂无评论" />
            </a-spin>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getChapterImages } from '../api/manga'
import { getChapterComments, postChapterComment } from '../api/comment'
import { useMangaStore } from '../stores/manga'
import { useThemeStore } from '../stores/theme'
import { useUserStore } from '../stores/user'
import { loadUIConfig, updateReaderConfig, DEFAULT_UI_CONFIG } from '@/config/ui-config'
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
const darkImageMaskOpacity = ref(0.3) // 暗色模式图片遮罩透明度

// 使用全局主题状态
const isDarkMode = computed(() => themeStore.isDarkMode)

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

// 跳转到上一章
const prevChapter = () => {
    if (hasPrevChapter.value) {
        // 如果有API返回的上一章ID，优先使用
        if (currentPrevChapterId.value) {
            const prevChapterId = currentPrevChapterId.value;

            // 在Pinia中查找索引并更新
            const prevIndex = mangaStore.findChapterIndex(prevChapterId);
            if (prevIndex !== -1) {
                mangaStore.setCurrentChapterIndex(prevIndex);
            }

            // 跳转到上一章
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord || route.params.pathWord,
                    chapterId: prevChapterId
                }
            });
        } else if (mangaStore.hasPrevChapter) {
            // 使用pinia中的章节信息
            const prevIndex = mangaStore.currentChapterIndex - 1;
            const prevChapter = mangaStore.currentChapters[prevIndex];

            mangaStore.setCurrentChapterIndex(prevIndex);
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord,
                    chapterId: prevChapter.id
                }
            });
        }
    }
}

// 跳转到下一章
const nextChapter = () => {
    if (hasNextChapter.value) {
        // 如果有API返回的下一章ID，优先使用
        if (currentNextChapterId.value) {
            const nextChapterId = currentNextChapterId.value;

            // 在Pinia中查找索引并更新
            const nextIndex = mangaStore.findChapterIndex(nextChapterId);
            if (nextIndex !== -1) {
                mangaStore.setCurrentChapterIndex(nextIndex);
            }

            // 跳转到下一章
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord || route.params.pathWord,
                    chapterId: nextChapterId
                }
            });
        } else if (mangaStore.hasNextChapter) {
            // 使用pinia中的章节信息
            const nextIndex = mangaStore.currentChapterIndex + 1;
            const nextChapter = mangaStore.currentChapters[nextIndex];

            mangaStore.setCurrentChapterIndex(nextIndex);
            router.push({
                name: 'ChapterReader',
                params: {
                    pathWord: mangaStore.pathWord,
                    chapterId: nextChapter.id
                }
            });
        }
    }
}

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
    hideNavTimer = setTimeout(() => {
        showBottomNav.value = false
    }, 0)
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
            // 滚动到顶部
            nextTick(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            })
        })
}

// 格式化评论时间
const formatCommentTime = (timeStr) => {
    const date = new Date(timeStr)
    const now = new Date()

    // 同一天内显示时间
    if (date.toDateString() === now.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }

    // 超过一天显示日期和时间
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 获取章节评论 - 完全独立的加载过程
const fetchComments = () => {
    if (!route.params.chapterId) return

    loadingComments.value = true
    commentsError.value = '' // 重置错误状态

    getChapterComments(route.params.chapterId, 100, 0)
        .then(response => {
            if (response && response.code === 200 && response.results) {
                comments.value = response.results.list || []
            } else {
                throw new Error('获取评论数据失败')
            }
        })
        .catch(error => {
            console.error('获取评论失败', error)
            commentsError.value = '获取评论失败，请点击重试按钮重新加载'
        })
        .finally(() => {
            loadingComments.value = false
        })
}

// 提交章节评论
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

    postChapterComment(route.params.chapterId, newComment.value.trim())
        .then(res => {
            if (res && res.code === 200) {
                message.success('评论发表成功')
                newComment.value = ''
                // 刷新评论列表
                fetchComments()
            } else {
                throw new Error(res?.message || '发表评论失败')
            }
        })
        .catch(error => {
            console.error('发表评论失败:', error)
            message.error(error.message || '发表评论失败')
        })
        .finally(() => {
            submitCommentLoading.value = false
        })
}

// 配置管理方法
const loadSettings = async () => {
    try {
        const config = await loadUIConfig()
        Object.assign(readerConfig, config.reader)
        // 加载暗色模式图片遮罩配置
        darkImageMaskOpacity.value = config.theme?.darkImageMask || 0.3
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
    // 检查是否有有效的章节数据
    if (!route.params.chapterId || (!mangaStore.currentChapters.length && !mangaStore.pathWord)) {
        // 数据不完整，返回首页
        console.error('缺少必要的章节数据')
        router.push('/')
        return
    }

    // 并行发起两个独立的请求，但互不影响
    fetchChapterImages()

    // 短暂延迟后再加载评论，避免两个请求同时发出导致的性能问题
    setTimeout(() => {
        fetchComments()
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
        // 滚动到顶部，以便用户看到新章节的开头
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        // 延迟加载评论，优先处理图片加载
        setTimeout(() => {
            fetchComments()
        }, 500)
    }
}, { immediate: false })

</script>

<style src='../assets/styles/chapter-reader.scss' scoped></style>
