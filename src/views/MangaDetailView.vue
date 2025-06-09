<template>
    <a-card class="manga-detail-container" :bordered="false">
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
                            <a-skeleton-button size="large" />
                        </div>
                        <a-skeleton-input style="width: 20%; margin-bottom: 12px;" />
                        <a-skeleton paragraph :rows="3" />
                    </a-col>
                </a-row>
            </template>

            <a-row :gutter="32">
                <a-col :xs="24" :sm="8">
                    <a-image :src="manga.cover" :alt="manga.name" width="100%" height="350px"
                        style="border-radius: 8px; object-fit: cover;" :placeholder="true">
                        <template #placeholder>
                            <div class="image-placeholder">
                                <a-spin size="large" />
                                <div style="margin-top: 12px; color: #666;">加载中...</div>
                            </div>
                        </template>
                        <template #error>
                            <div class="image-error">
                                <div class="error-icon">📖</div>
                                <div class="error-text">暂无封面</div>
                            </div>
                        </template>
                    </a-image>
                </a-col>
                <a-col :xs="24" :sm="16">
                    <a-typography-title :level="2">{{ manga.name || '漫画详情' }}</a-typography-title>
                    <a-descriptions :column="1" size="small" bordered>
                        <a-descriptions-item label="作者" v-if="manga.author && manga.author.length">
                            <a-tag v-for="a in manga.author" :key="a.name" @click="goToAuthorPage(a)"
                                class="author-tag">
                                {{ a.name }}
                            </a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="题材" v-if="manga.theme && manga.theme.length">
                            <a-tag v-for="t in manga.theme" :key="t.name" color="blue">{{ t.name }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="状态" v-if="manga.status">
                            <a-tag color="green">{{ manga.status.display }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="人气" v-if="manga.popular">
                            {{ manga.popular }}
                        </a-descriptions-item>
                        <a-descriptions-item label="最新章节" v-if="manga.last_chapter && manga.last_chapter.name">
                            {{ manga.last_chapter.name }}
                        </a-descriptions-item>
                        <a-descriptions-item label="更新时间" v-if="manga.datetime_updated">
                            {{ formatDate(manga.datetime_updated) }}
                        </a-descriptions-item>
                    </a-descriptions>
                    <div style="margin: 24px 0 0 0;">
                        <!-- 来自书架时显示继续阅读按钮 -->
                        <a-button v-if="fromCollection && lastBrowseInfo && lastBrowseInfo.last_browse_id"
                            type="primary" @click="continueReading" style="margin-right: 10px">
                            继续阅读
                        </a-button>
                        <!-- 常规开始阅读按钮 -->
                        <a-button v-else type="primary" @click="startReading" :disabled="!chapters.length"
                            style="margin-right: 10px">
                            开始阅读
                        </a-button>

                        <!-- 根据来源显示不同的收藏按钮 -->
                        <template v-if="fromCollection">
                            <!-- 来自书架只显示取消收藏按钮 -->
                            <a-button danger @click="handleCollect(false)" :loading="collectLoading"
                                style="margin-right: 10px">取消收藏</a-button>
                        </template>
                        <template v-else>
                            <!-- 其他来源显示完整的收藏按钮 -->
                            <a-button @click="handleCollect" :loading="collectLoading"
                                style="margin-right: 10px">加入书架</a-button>
                            <a-button danger @click="handleCollect(false)" :loading="collectLoading"
                                style="margin-right: 10px">取消收藏</a-button>
                        </template>

                        <a-button @click="fetchMangaData" :loading="detailLoading">刷新数据</a-button>
                    </div>
                    <div style="margin-top: 20px;">
                        <a-typography-title :level="4">简介</a-typography-title>

                        <!-- 来自书架时显示上次阅读信息 -->
                        <div v-if="fromCollection && lastBrowseInfo" class="last-browse-info">
                            <a-alert :message="`上次阅读: ${lastBrowseInfo.last_browse_name || '未知章节'}`" type="info"
                                show-icon style="margin-bottom: 16px;"
                                :description="lastBrowseInfo.datetime_browse ? `阅读时间: ${formatDate(lastBrowseInfo.datetime_browse)}` : null" />
                        </div>

                        <a-typography-paragraph>{{ manga.brief || '暂无简介' }}</a-typography-paragraph>
                    </div>
                </a-col>
            </a-row>
        </a-skeleton>
        <a-divider />

        <a-row justify="space-between" align="middle" style="margin-bottom: 12px;">
            <a-col>
                <a-space>
                    <!-- 排序切换 -->
                    <a-button @click="toggleSortOrder" size="small">
                        {{ isAscending ? '正序' : '倒序' }}
                    </a-button>
                </a-space>
            </a-col>
        </a-row>

        <!-- 分组Tab页 -->
        <a-tabs v-model:activeKey="currentGroup" @change="handleGroupChange" size="small" style="margin-bottom: 16px;">
            <a-tab-pane v-for="(group, key) in groups" :key="key" :tab="`${group.name} (${group.count})`">
            </a-tab-pane>
        </a-tabs>

        <a-skeleton :loading="loading || groupLoading" active>
            <a-row :gutter="[12, 12]">
                <a-col :xs="12" :sm="8" :md="6" :lg="4" :xl="3" v-for="chapter in sortedChapters" :key="chapter.id">
                    <a-card :hoverable="true" @click="goToChapter(chapter)"
                        style="cursor:pointer; text-align:center; padding:0;" size="small"
                        :body-style="{ padding: '12px 6px' }"
                        :class="{ 'last-read-chapter': isLastReadChapter(chapter) }">
                        <span style="font-size:14px;">{{ chapter.name }}</span>
                        <!-- 显示"上次阅读"标记 -->
                        <div v-if="isLastReadChapter(chapter)" class="last-read-tag">
                            上次阅读
                        </div>
                    </a-card>
                </a-col>
            </a-row>
        </a-skeleton>

        <!-- 分页组件 -->
        <div v-if="totalChapters > pageSize" class="pagination-container">
            <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="totalChapters"
                :show-size-changer="true" :show-quick-jumper="true"
                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 章`"
                :page-size-options="['20', '50', '100', '200']" @change="handlePageChange"
                @showSizeChange="handlePageChange" style="margin-top: 24px; text-align: center;" />
        </div>

        <!-- 漫画评论区 -->
        <a-collapse v-model:activeKey="commentsActiveKey" style="margin-top: 24px;" @change="handleCommentsToggle">
            <a-collapse-panel key="comments" header="漫画评论">
                <!-- 评论输入框 -->
                <div v-if="commentsActiveKey.includes('comments')" class="comment-input-section"
                    style="margin-bottom: 16px;">
                    <a-textarea v-model:value="newComment" placeholder="这里是评论区，不是无人区..." :rows="1" :maxlength="200"
                        show-count style="margin-bottom: 8px;" />
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <a-button type="primary" @click="submitComment" :loading="submitCommentLoading"
                            :disabled="!newComment.trim() || !isLoggedIn" size="small">
                            发送
                        </a-button>
                    </div>
                </div>
                <a-divider v-if="commentsActiveKey.includes('comments')" style="margin: 16px 0;" />

                <a-skeleton :loading="commentsLoading" active>
                    <div v-if="comments.length === 0 && !commentsLoading"
                        style="text-align: center; color: #999; padding: 20px;">
                        暂无评论
                    </div>
                    <div v-else>
                        <div class="compact-comments-container">
                            <a-comment v-for="comment in comments" :key="comment.id" :author="comment.user_name"
                                :avatar="comment.user_avatar" :content="comment.comment"
                                :datetime="formatCommentTime(comment.create_at)" class="compact-comment-item" />
                        </div>

                        <!-- 评论分页 -->
                        <div v-if="commentsTotal > commentsPageSize" style="text-align: center; margin-top: 16px;">
                            <a-pagination v-model:current="commentsPage" v-model:page-size="commentsPageSize"
                                :total="commentsTotal" :show-size-changer="false" :show-quick-jumper="true"
                                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条评论`"
                                @change="handleCommentsPageChange" size="small" />
                        </div>
                    </div>
                </a-skeleton>
            </a-collapse-panel>
        </a-collapse>
    </a-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMangaDetail, collectManga, getMangaGroupChapters } from '../api/manga'
import { getMangaComments, postMangaComment } from '../api/comment'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const manga = ref({})
const chapters = ref([])
const loading = ref(true)
const detailLoading = ref(true)
const collectLoading = ref(false)
const isAscending = ref(false)

// 分组相关状态
const groups = ref({})
const currentGroup = ref('default')
const groupLoading = ref(false)

// 分页相关状态
const currentPage = ref(1)
const pageSize = ref(100)
const totalChapters = ref(0)

// 来自书架的功能相关状态
const fromCollection = ref(false)
const lastBrowseInfo = ref(null)

// 刷新状态
const refreshing = ref(false)

// 评论相关状态
const comments = ref([])
const commentsLoading = ref(false)
const commentsActiveKey = ref([])
const commentsPage = ref(1)
const commentsPageSize = ref(10)
const commentsTotal = ref(0)
const commentsLoaded = ref(false)

// 新评论相关状态
const newComment = ref('')
const submitCommentLoading = ref(false)

// 计算属性：检查用户是否已登录
const isLoggedIn = computed(() => userStore.isLoggedIn)

const sortedChapters = computed(() => {
    return [...chapters.value].sort((a, b) => isAscending.value ? a.index - b.index : b.index - a.index)
})

const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
}

// 格式化评论时间
const formatCommentTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) {
        return `${days}天前`
    } else if (hours > 0) {
        return `${hours}小时前`
    } else if (minutes > 0) {
        return `${minutes}分钟前`
    } else {
        return '刚刚'
    }
}

const toggleSortOrder = () => {
    isAscending.value = !isAscending.value
}

const goToChapter = (chapter) => {
    router.push({
        name: 'ChapterReader',
        params: {
            pathWord: manga.value.path_word,
            chapterId: chapter.id
        }
    })
}

const goToAuthorPage = (author) => {
    router.push({
        name: 'AuthorMangaList',
        params: { authorPathWord: author.path_word },
        query: { name: author.name }
    })
}

const startReading = () => {
    if (chapters.value.length > 0) {
        const firstChapter = isAscending.value ? chapters.value[0] : chapters.value[chapters.value.length - 1]
        goToChapter(firstChapter)
    }
}

// 继续阅读功能
const continueReading = () => {
    if (lastBrowseInfo.value && lastBrowseInfo.value.last_browse_id) {
        // 查找上次阅读的章节
        const lastChapter = chapters.value.find(ch => ch.id === lastBrowseInfo.value.last_browse_id)
        if (lastChapter) {
            goToChapter(lastChapter)
        } else {
            message.warning('未找到上次阅读的章节，将从第一章开始')
            startReading()
        }
    } else {
        startReading()
    }
}

// 检查是否为上次阅读的章节
const isLastReadChapter = (chapter) => {
    return fromCollection.value &&
        lastBrowseInfo.value &&
        lastBrowseInfo.value.last_browse_id === chapter.id
}

// 获取漫画详情信息
const fetchMangaDetail = async () => {
    detailLoading.value = true
    const pathWord = route.params.pathWord

    return getMangaDetail(pathWord).then(res => {
        manga.value = res.results.comic
        // 保存分组信息
        if (res.results.groups) {
            groups.value = res.results.groups
            // 设置默认分组
            currentGroup.value = 'default'
        }
        return true
    }).catch((error) => {
        console.error('获取漫画详情失败', error)
        message.error('获取漫画详情失败')
        return false
    }).finally(() => {
        detailLoading.value = false
    })
}

// 获取漫画章节信息
const fetchMangaChapter = async () => {
    // 如果来自书架且有上次阅读信息，尝试找到对应章节所在的页面
    if (fromCollection.value && lastBrowseInfo.value && lastBrowseInfo.value.last_browse_id) {
        await findAndLoadPageWithChapter(lastBrowseInfo.value.last_browse_id)
    } else {
        // 加载默认分组的第一页章节
        await loadGroupChapters('default', 1)
    }
}

// 初始化数据加载
const fetchMangaData = async () => {
    if (!manga.value.name) {
        await fetchMangaDetail()
    }
    if (chapters.value.length === 0) {
        await fetchMangaChapter()
    }

}

// 加载指定分组的章节
const loadGroupChapters = async (groupPathWord, page = 1) => {
    loading.value = true
    const pathWord = route.params.pathWord
    const offset = (page - 1) * pageSize.value

    try {
        const res = await getMangaGroupChapters(pathWord, groupPathWord, pageSize.value, offset)
        if (res && res.code === 200 && res.results) {
            // 处理章节数据，转换为与旧API相同的格式
            const chapterList = res.results.list || []
            chapters.value = chapterList.map((chapter, index) => ({
                id: chapter.uuid,
                name: chapter.name,
                index: chapter.index,
                comic_path_word: chapter.comic_path_word,
                group_path_word: chapter.group_path_word,
                datetime_created: chapter.datetime_created,
                size: chapter.size,
                count: chapter.count
            }))

            // 更新分页信息
            totalChapters.value = res.results.total || 0
            currentPage.value = page
        } else {
            throw new Error('获取章节数据失败')
        }
    } catch (error) {
        console.error('获取分组章节失败', error)
        message.error('获取分组章节失败')
        chapters.value = []
        totalChapters.value = 0
    } finally {
        loading.value = false
    }
}

// 查找并加载包含指定章节ID的页面
const findAndLoadPageWithChapter = async (targetChapterId) => {
    const pathWord = route.params.pathWord

    try {
        // 先获取第一页来确定总章节数
        const firstPageRes = await getMangaGroupChapters(pathWord, 'default', pageSize.value, 0)
        if (firstPageRes && firstPageRes.code === 200 && firstPageRes.results) {
            const total = firstPageRes.results.total || 0
            const totalPages = Math.ceil(total / pageSize.value)

            // 检查第一页是否包含目标章节
            const firstPageChapters = firstPageRes.results.list || []
            const foundInFirstPage = firstPageChapters.some(chapter => chapter.uuid === targetChapterId)

            if (foundInFirstPage) {
                // 在第一页找到了，直接加载第一页
                await loadGroupChapters('default', 1)
                console.log(`上次阅读章节在第 1 页`)
                return
            }

            // 逐页搜索目标章节（从第2页开始）
            for (let page = 2; page <= totalPages; page++) {
                const offset = (page - 1) * pageSize.value
                const pageRes = await getMangaGroupChapters(pathWord, 'default', pageSize.value, offset)

                if (pageRes && pageRes.code === 200 && pageRes.results) {
                    const pageChapters = pageRes.results.list || []
                    const foundInPage = pageChapters.some(chapter => chapter.uuid === targetChapterId)

                    if (foundInPage) {
                        await loadGroupChapters('default', page)
                        console.log(`上次阅读章节在第 ${page} 页`)
                        return
                    }
                }

                // 避免搜索过多页面，最多搜索10页
                if (page >= 10) {
                    console.log('搜索超过10页，停止搜索')
                    break
                }
            }
        }

        // 如果没有找到目标章节，加载第一页
        console.log('未找到上次阅读章节，加载第一页')
        await loadGroupChapters('default', 1)

    } catch (error) {
        console.error('查找章节页面失败:', error)
        // 发生错误时，回退到加载第一页
        await loadGroupChapters('default', 1)
    }
}

// 处理分页切换
const handlePageChange = async (page, size) => {
    pageSize.value = size
    await loadGroupChapters(currentGroup.value, page)
}

// 处理分组切换
const handleGroupChange = async (groupPathWord) => {
    console.log('切换分组到:', groupPathWord)
    currentGroup.value = groupPathWord
    currentPage.value = 1 // 重置页码
    groupLoading.value = true
    try {
        await loadGroupChapters(groupPathWord, 1)
    } finally {
        groupLoading.value = false
    }
}

// 收藏或取消收藏漫画
const handleCollect = (isCollect = true) => {
    collectLoading.value = true
    collectManga(manga.value.uuid, isCollect).then(res => {
        message.success(isCollect ? '收藏成功' : '取消收藏成功')
    }).catch(err => {
        message.error(err.message)
    }).finally(() => {
        collectLoading.value = false
    })
}

// 处理评论区展开/折叠
const handleCommentsToggle = (activeKey) => {
    console.log('评论区切换:', activeKey, '已加载:', commentsLoaded.value, 'manga uuid:', manga.value.uuid)

    // 当评论区被展开且还未加载过评论时，加载评论
    if (activeKey &&
        (Array.isArray(activeKey) ? activeKey.includes('comments') : activeKey === 'comments') &&
        !commentsLoaded.value) {
        fetchMangaComments()
    }
}

// 获取漫画评论
const fetchMangaComments = async (page = 1) => {
    if (!manga.value.uuid) {
        console.log('没有 manga uuid，退出')
        return
    }
    commentsLoading.value = true
    const offset = (page - 1) * commentsPageSize.value

    try {
        const res = await getMangaComments(manga.value.uuid, commentsPageSize.value, offset)
        if (res && res.code === 200 && res.results) {
            comments.value = res.results.list || []
            commentsTotal.value = res.results.total || 0
            commentsPage.value = page
            commentsLoaded.value = true
        }
    } catch (error) {
        console.error('获取评论失败:', error)
        message.error('获取评论失败')
    } finally {
        commentsLoading.value = false
    }
}

// 处理评论分页
const handleCommentsPageChange = (page) => {
    fetchMangaComments(page)
}

// 提交评论
const submitComment = async () => {
    const commentText = newComment.value.trim()

    if (!commentText) {
        message.warning('请输入评论内容')
        return
    }

    // 验证评论长度（3-200字符）
    if (commentText.length < 3) {
        message.warning('评论内容至少需要3个字符')
        return
    }

    if (commentText.length > 200) {
        message.warning('评论内容不能超过200个字符')
        return
    }

    if (!isLoggedIn.value) {
        message.warning('请先登录')
        return
    }

    if (!manga.value.uuid) {
        message.error('漫画信息不完整')
        return
    }

    submitCommentLoading.value = true

    await postMangaComment(manga.value.uuid, commentText).then(res => {
        message.success('评论发表成功')
        newComment.value = ''
        fetchMangaComments(1) // 刷新评论列表
    }).catch(error => {
        console.error('发表评论失败:', error)
        message.error(error.message || '发表评论失败')
    }).finally(() => {
        submitCommentLoading.value = false
    })

}

onMounted(() => {
    // 检查是否来自书架
    if (route.query.from === 'collection') {
        fromCollection.value = true

        // 解析上次阅读信息
        if (route.query.lastBrowse) {
            try {
                lastBrowseInfo.value = JSON.parse(route.query.lastBrowse)
            } catch (e) {
                console.warn('解析上次阅读信息失败:', e)
                lastBrowseInfo.value = null
            }
        }
    }

    fetchMangaData()
})
</script>

<style src="../assets/styles/manga-detail.scss" scoped></style>
