<template>
    <a-card class="cartoon-detail-container" :bordered="false">
        <a-skeleton :loading="detailLoading" active avatar>
            <template #skeleton>
                <a-row :gutter="32">
                    <a-col :xs="24" :sm="8">
                        <a-skeleton-image style="width: 100%; height: 350px; border-radius: 8px;" />
                    </a-col>
                    <a-col :xs="24" :sm="16">
                        <a-skeleton-input style="width: 60%; margin-bottom: 16px;" size="large" />
                        <a-skeleton paragraph active :rows="6" />
                        <div style="margin: 24px 0;">
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                        </div>
                        <a-skeleton-input style="width: 20%; margin-bottom: 12px;" />
                        <a-skeleton paragraph :rows="3" />
                    </a-col>
                </a-row>
            </template>

            <a-row :gutter="32">
                <a-col :xs="24" :sm="8">
                    <a-image :src="cartoon.cover" :alt="cartoon.name" width="100%" height="350px"
                        style="border-radius: 8px; object-fit: cover;" :placeholder="true">
                        <template #placeholder>
                            <div class="image-placeholder">
                                <a-spin size="large" />
                                <div style="margin-top: 12px; color: #666;">加载中...</div>
                            </div>
                        </template>
                        <template #error>
                            <div class="image-error">
                                <div class="error-icon">🎬</div>
                                <div class="error-text">暂无封面</div>
                            </div>
                        </template>
                    </a-image>
                </a-col>
                <a-col :xs="24" :sm="16">
                    <a-typography-title :level="2">{{ cartoon.name || '动画详情' }}</a-typography-title>
                    <a-descriptions :column="1" size="small" bordered>
                        <a-descriptions-item label="公司" v-if="cartoon.company">
                            <a-tag color="blue">{{ cartoon.company.name }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="题材" v-if="cartoon.theme && cartoon.theme.length">
                            <a-tag v-for="t in cartoon.theme" :key="t.name" color="green">{{ t.name }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="类型" v-if="cartoon.cartoon_type">
                            <a-tag color="orange">{{ cartoon.cartoon_type.display }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="分类" v-if="cartoon.category">
                            <a-tag color="purple">{{ cartoon.category.display }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="等级" v-if="cartoon.grade">
                            <a-tag color="red">{{ cartoon.grade.display }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="人气" v-if="popular">
                            {{ formatNumber(popular) }}
                        </a-descriptions-item>
                        <a-descriptions-item label="最新章节" v-if="cartoon.last_chapter && cartoon.last_chapter.name">
                            {{ cartoon.last_chapter.name }}
                        </a-descriptions-item>
                        <a-descriptions-item label="更新时间" v-if="cartoon.datetime_updated">
                            {{ formatDate(cartoon.datetime_updated) }}
                        </a-descriptions-item>
                        <a-descriptions-item label="发布时间" v-if="cartoon.years">
                            {{ cartoon.years }}
                        </a-descriptions-item>
                    </a-descriptions>
                    <div style="margin: 24px 0 0 0;">
                        <a-button type="primary" @click="startWatching" :disabled="!chapters.length"
                            style="margin-right: 10px">
                            开始观看
                        </a-button> <a-button type="default" @click="handleCollect" :loading="collectLoading"
                            style="margin-right: 10px; color: #ff4d4f; border-color: #ff4d4f;">
                            <template #icon>
                                <HeartFilled />
                            </template>
                            收藏
                        </a-button>
                        <a-button type="default" @click="handleCancelCollect" :loading="cancelCollectLoading"
                            style="margin-right: 10px">
                            <template #icon>
                                <HeartOutlined />
                            </template>
                            取消收藏
                        </a-button>
                        <a-button @click="fetchCartoonData" :loading="detailLoading">刷新数据</a-button>
                    </div>
                    <div style="margin-top: 20px;" v-if="cartoon.brief">
                        <a-typography-title :level="4">简介</a-typography-title>
                        <a-typography-paragraph>
                            {{ cartoon.brief }}
                        </a-typography-paragraph>
                    </div>
                </a-col>
            </a-row>
        </a-skeleton>

        <!-- 章节列表 -->
        <div class="chapters-section" style="margin-top: 32px;">
            <a-skeleton :loading="chaptersLoading" active>
                <template #skeleton>
                    <a-row :gutter="[16, 16]">
                        <a-col v-for="i in 12" :key="i" :xs="12" :sm="8" :md="6" :lg="4">
                            <a-skeleton-button style="width: 100%; height: 120px;" />
                        </a-col>
                    </a-row>
                </template>

                <div v-if="chapters.length" class="chapters-grid">
                    <div v-for="chapter in chapters" :key="chapter.uuid" class="chapter-card">
                        <div class="chapter-cover" @click="playChapter(chapter)">
                            <a-image :src="chapter.v_cover" :alt="chapter.name" :preview="false"
                                style="width: 100%; height: 100%; object-fit: cover;" />
                            <div class="play-icon">
                                <play-circle-outlined />
                            </div>
                        </div>
                        <div class="chapter-info">
                            <h5 class="chapter-name" :title="chapter.name">{{ chapter.name }}</h5>
                            <div class="chapter-lines" v-if="chapter.lines && chapter.lines.length">
                                <a-tag v-for="line in chapter.lines.slice(0, 2)" :key="line.path_word" size="small">
                                    {{ line.name }}
                                </a-tag>
                            </div>

                            <!-- 下载进度条 -->
                            <div v-if="chapterDownloadStatus[chapter.uuid] === 'downloading'" class="download-progress">
                                <a-progress :percent="chapterDownloadProgress[chapter.uuid] || 0"
                                    :status="chapterDownloadProgress[chapter.uuid] >= 100 ? 'success' : 'active'"
                                    :stroke-width="4" :show-info="true" :format="percent => `${Math.floor(percent)}%`"
                                    style="width: 100%;" />
                                <div class="progress-text"
                                    style="text-align: center; font-size: 12px; color: #666; margin-top: 4px;">
                                    {{ chapterDownloadProgressText[chapter.uuid] || '准备下载...' }}
                                </div>
                            </div>

                            <!-- 按钮区域 -->
                            <div class="chapter-actions">
                                <!-- 下载按钮 -->
                                <a-button
                                    v-if="!chapterDownloadStatus[chapter.uuid] || chapterDownloadStatus[chapter.uuid] === 'error'"
                                    size="small" type="primary" @click.stop="downloadChapter(chapter)"
                                    :loading="chapterDownloadStatus[chapter.uuid] === 'downloading'">
                                    <template #icon>
                                        <download-outlined />
                                    </template>
                                    下载
                                </a-button>

                                <!-- 打开目录按钮 -->
                                <a-button v-if="chapterDownloadStatus[chapter.uuid] === 'downloaded'" size="small"
                                    type="primary" @click.stop="openVideoDirectory(chapter)">
                                    <template #icon>
                                        <folder-open-outlined />
                                    </template>
                                    打开目录
                                </a-button>

                                <!-- 删除按钮 -->
                                <a-button v-if="chapterDownloadStatus[chapter.uuid] === 'downloaded'" size="small"
                                    danger @click.stop="deleteChapter(chapter)">
                                    <template #icon>
                                        <delete-outlined />
                                    </template>
                                </a-button>
                            </div>
                        </div>
                    </div>
                </div>

                <a-empty v-else-if="!chaptersLoading" description="暂无章节数据" />
            </a-skeleton>
        </div>
    </a-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlayCircleOutlined, HeartOutlined, HeartFilled, DownloadOutlined, CheckCircleOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons-vue'
import { getCartoonInfo, getCartoonChapters, collectCartoon, downloadCartoonChapter, isCartoonChapterDownloaded, deleteCartoonChapter, openLocalVideoDirectory } from '../api/cartoon'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/number'
import { useCartoonPlayerStore } from '../stores/cartoon-player'

const route = useRoute()
const router = useRouter()
const cartoonPlayerStore = useCartoonPlayerStore()

const cartoon = ref({})
const chapters = ref([])
const popular = ref(0)
const detailLoading = ref(false)
const chaptersLoading = ref(false)
const collectLoading = ref(false)
const cancelCollectLoading = ref(false)

// 下载相关状态
const chapterDownloadStatus = ref({}) // 章节下载状态: downloading, downloaded, error
const chapterDownloadProgress = ref({}) // 章节下载进度
const chapterDownloadProgressText = ref({}) // 章节下载进度文本

const fetchCartoonData = () => {
    const pathWord = route.params.pathWord
    if (!pathWord) {
        message.error('动画参数错误')
        return
    }

    detailLoading.value = true

    getCartoonInfo(pathWord).then(response => {
        const results = response.results
        cartoon.value = results.cartoon || {}
        popular.value = results.popular || 0

        // 获取章节列表
        fetchChapters(pathWord)
    }).catch(err => {
        console.error('获取动画详情失败:', err)
        message.error(err.message || '获取动画详情失败')
    }).finally(() => {
        detailLoading.value = false
    })
}

const fetchChapters = (pathWord) => {
    chaptersLoading.value = true

    getCartoonChapters(pathWord).then(response => {
        chapters.value = response.results.list || []

        // 获取章节列表后立即缓存到 store
        cartoonPlayerStore.setChapters(pathWord, chapters.value)

        // 检查章节下载状态
        if (chapters.value.length > 0) {
            checkChapterDownloadStatus(chapters.value)
        }
    }).catch(err => {
        console.error('获取章节列表失败:', err)
        message.error(err.message || '获取章节列表失败')
    }).finally(() => {
        chaptersLoading.value = false
    })
}

const startWatching = () => {
    if (!chapters.value.length) {
        message.warning('暂无章节可观看')
        return
    }

    const firstChapter = chapters.value[0]
    playChapter(firstChapter)
}

const playChapter = (chapter) => {
    if (!chapter.uuid) {
        message.warning('章节信息异常，无法播放')
        return
    }

    // 选择默认线路（优先选择可用的线路）
    const availableLine = chapter.lines?.find(line => line.config)
    const defaultLine = availableLine?.path_word || 'line3'

    // 跳转到播放页面
    router.push({
        name: 'CartoonPlayer',
        params: {
            pathWord: route.params.pathWord,
            chapterId: chapter.uuid
        },
        query: {
            line: defaultLine
        }
    })
}

const handleCollect = () => {
    if (!cartoon.value.uuid) {
        message.warning('动画信息异常，无法收藏')
        return
    }

    collectLoading.value = true

    collectCartoon(cartoon.value.uuid, true).then(() => {
        message.success('收藏成功')
    }).catch(err => {
        console.error('收藏失败:', err)
        message.error(err.message || '收藏失败')
    }).finally(() => {
        collectLoading.value = false
    })
}

const handleCancelCollect = () => {
    if (!cartoon.value.uuid) {
        message.warning('动画信息异常，无法取消收藏')
        return
    }

    cancelCollectLoading.value = true

    collectCartoon(cartoon.value.uuid, false).then(() => {
        message.success('取消收藏成功')
    }).catch(err => {
        console.error('取消收藏失败:', err)
        message.error(err.message || '取消收藏失败')
    }).finally(() => {
        cancelCollectLoading.value = false
    })
}

// 下载章节功能
const downloadChapter = async (chapter) => {
    // 检查是否已下载
    if (chapterDownloadStatus.value[chapter.uuid] === 'downloaded') {
        message.info('章节已下载')
        return
    }

    // 设置下载状态
    chapterDownloadStatus.value[chapter.uuid] = 'downloading'
    chapterDownloadProgress.value[chapter.uuid] = 0

    // 选择默认线路（优先选择可用的线路）
    const availableLine = chapter.lines?.find(line => line.config)
    const defaultLine = availableLine?.path_word || 'line3'

    // 构建章节信息，包含动画详情
    const chapterInfo = {
        // 传递当前页面的动画详情信息用于保存到本地
        cartoonDetail: cartoon.value ? {
            uuid: cartoon.value.uuid,
            name: cartoon.value.name,
            path_word: route.params.pathWord,
            cover: cartoon.value.cover || '',
            company: cartoon.value.company?.name || null,
            theme: cartoon.value.theme ? cartoon.value.theme.map(t => t.name || t) : [],
            cartoon_type: cartoon.value.cartoon_type?.display || null,
            category: cartoon.value.category?.display || null,
            grade: cartoon.value.grade?.display || null,
            popular: cartoon.value.popular || null,
            brief: cartoon.value.brief || null,
            years: cartoon.value.years || null,
            datetime_updated: cartoon.value.datetime_updated || null
        } : null
    }

    // 调用下载API
    return downloadCartoonChapter(
        route.params.pathWord,
        chapter.uuid,
        defaultLine,
        chapterInfo,
        (progressInfo) => {
            // 更新进度
            chapterDownloadProgress.value[chapter.uuid] = progressInfo.percent || 0
            chapterDownloadProgressText.value[chapter.uuid] = progressInfo.currentFile || '准备下载...'

            if (progressInfo.status === 'error') {
                console.error('下载进度错误:', progressInfo.error)
            }
        }
    ).then(() => {
        // 下载完成
        chapterDownloadStatus.value[chapter.uuid] = 'downloaded'
        chapterDownloadProgress.value[chapter.uuid] = 100
        chapterDownloadProgressText.value[chapter.uuid] = '下载完成'
        message.success({
            content: `动画章节 "${chapter.name}" 下载完成`,
            class: 'right-bottom-msg'
        });
    }).catch(error => {
        console.error('下载动画章节失败:', error)
        // 下载失败
        chapterDownloadStatus.value[chapter.uuid] = 'error'
        chapterDownloadProgress.value[chapter.uuid] = 0
        chapterDownloadProgressText.value[chapter.uuid] = '下载失败'
        message.error(`下载失败: ${error.message || '未知错误'}`)
    })
}

// 删除章节功能
const deleteChapter = async (chapter) => {
    await deleteCartoonChapter(
        cartoon.value.uuid,
        chapter.uuid
    ).then(() => {
        // 更新下载状态
        delete chapterDownloadStatus.value[chapter.uuid]
        delete chapterDownloadProgress.value[chapter.uuid]
        delete chapterDownloadProgressText.value[chapter.uuid]
        message.success(`动画章节 "${chapter.name}" 删除成功`)
    }).catch(error => {
        console.error('删除动画章节失败:', error)
        message.error(`删除失败: ${error.message || '未知错误'}`)
    })
}

// 打开本地视频目录
const openVideoDirectory = async (chapter) => {
    try {
        await openLocalVideoDirectory(cartoon.value.uuid, chapter.uuid)
        message.success('目录打开成功')
    } catch (error) {
        console.error('打开目录失败:', error)
        message.error(`打开目录失败: ${error.message || '未知错误'}`)
    }
}

// 检查章节下载状态
const checkChapterDownloadStatus = async (chapters) => {
    if (!cartoon.value?.uuid) {
        console.warn('动画UUID为空，无法检查下载状态')
        return
    }

    try {
        // 批量查询本地已下载的章节
        const { getLocalCartoonChapters } = await import('../api/cartoon')
        const localChapters = await getLocalCartoonChapters(cartoon.value.uuid)

        // 创建本地章节UUID的Set，方便快速查询
        const downloadedChapterUuids = new Set(localChapters.map(ch => ch.chapter_uuid))

        // 更新当前显示章节的下载状态
        for (const chapter of chapters) {
            if (downloadedChapterUuids.has(chapter.uuid)) {
                chapterDownloadStatus.value[chapter.uuid] = 'downloaded'
            }
        }

        console.log(`动画 ${cartoon.value.name}: 批量检查完成，已下载章节数: ${downloadedChapterUuids.size}`)
    } catch (error) {
        console.error('批量检查动画章节下载状态失败:', error)
    }
}

onMounted(() => {
    // TODO 加载分离
    fetchCartoonData()
})
</script>

<style lang="scss" src="../assets/styles/cartoon-detail.scss" scoped></style>
