import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMangaDetail, collectManga, getMangaGroupChapters, downloadChapter as downloadChapterAPI } from '../api/manga'
import { getMangaComments, postMangaComment } from '../api/comment'
import { downloadManager } from '../utils/download-manager'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

export function useMangaDetail() {
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()

    // 响应式状态
    const manga = ref({})
    const chapters = ref([])
    const loading = ref(false)
    const detailLoading = ref(false)
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

    // 下载相关状态
    const chapterDownloadStatus = ref({}) // 章节下载状态：'downloading', 'downloaded', 'error'
    const chapterDownloadProgress = ref({}) // 章节下载进度

    // 计算属性
    const isLoggedIn = computed(() => userStore.isLoggedIn)

    const sortedChapters = computed(() => {
        return [...chapters.value].sort((a, b) => isAscending.value ? a.index - b.index : b.index - a.index)
    })

    // 业务逻辑函数
    const toggleSortOrder = () => {
        isAscending.value = !isAscending.value
    }

    const goToChapter = (chapter) => {
        router.push({
            name: 'ChapterReader',
            params: {
                pathWord: manga.value.path_word,
                chapterId: chapter.id
            },
            query: {
                mangaUuid: manga.value.uuid
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
                return
            }
            message.warning('未找到上次阅读的章节，将从第一章开始')
            startReading()
        }
    }

    // 检查是否为上次阅读的章节
    const isLastReadChapter = (chapter) => {
        return fromCollection.value && lastBrowseInfo.value && lastBrowseInfo.value.last_browse_id === chapter.id
    }    // 获取漫画详情信息
    const fetchMangaDetail = async () => {
        const pathWord = route.params.pathWord

        await getMangaDetail(pathWord).then(res => {
            manga.value = res.results.comic
            groups.value = res.results.groups
            currentGroup.value = 'default'
        }).catch(error => {
            console.error('获取漫画详情失败', error)
        })
    }

    // 获取漫画章节信息
    const fetchMangaChapter = async () => {
        // 如果来自书架且有上次阅读信息，尝试找到对应章节所在的页面
        if (fromCollection.value && lastBrowseInfo.value && lastBrowseInfo.value.last_browse_id) {
            await findAndLoadPageWithChapter(lastBrowseInfo.value.last_browse_id)
            return
        }
        await loadGroupChapters('default', 1)
    }

    // 初始化数据加载
    const fetchMangaData = async () => {
        detailLoading.value = true
        await fetchMangaDetail().finally(() => detailLoading.value = false)
        await fetchMangaChapter()

    }

    // 加载指定分组的章节
    const loadGroupChapters = async (groupPathWord, page = 1) => {
        loading.value = true
        const pathWord = route.params.pathWord
        const offset = (page - 1) * pageSize.value

        await getMangaGroupChapters(pathWord, groupPathWord, pageSize.value, offset).then(async res => {
            // 处理章节数据，转换为与旧API相同的格式
            const chapterList = res.results.list || []
            chapters.value = chapterList.map((chapter, index) => ({
                id: chapter.uuid,
                uuid: chapter.uuid, // 保留 uuid 字段用于下载检查
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

            // 检查章节下载状态
            await checkChapterDownloadStatus(chapters.value)
        }).catch(error => {
            console.error('获取分组章节失败', error)
            message.error('获取分组章节失败')
            chapters.value = []
            totalChapters.value = 0
        }).finally(() => {
            loading.value = false
        })
    }

    // 查找并加载包含指定章节ID的页面
    const findAndLoadPageWithChapter = async (targetChapterId) => {
        const pathWord = route.params.pathWord

        try {
            // 先获取第一页来确定总章节数
            const firstPageRes = await getMangaGroupChapters(pathWord, 'default', pageSize.value, 0)
            const total = firstPageRes.results.total || 0
            const totalPages = Math.ceil(total / pageSize.value)

            // 检查第一页是否包含目标章节
            const firstPageChapters = firstPageRes.results.list || []
            const foundInFirstPage = firstPageChapters.some(chapter => chapter.uuid === targetChapterId)

            if (foundInFirstPage) {
                await loadGroupChapters('default', 1)
                console.log(`上次阅读章节在第 1 页`)
                return
            }

            // 逐页搜索目标章节（从第2页开始）
            for (let page = 2; page <= totalPages; page++) {
                const offset = (page - 1) * pageSize.value
                const pageRes = await getMangaGroupChapters(pathWord, 'default', pageSize.value, offset)

                const pageChapters = pageRes.results.list || []
                const foundInPage = pageChapters.some(chapter => chapter.uuid === targetChapterId)

                if (foundInPage) {
                    await loadGroupChapters('default', page)
                    console.log(`上次阅读章节在第 ${page} 页`)
                    return
                }
                // 避免搜索过多页面，最多搜索10页
                if (page >= 10) {
                    console.log('搜索超过10页，停止搜索')
                    break
                }
            }

            // 如果没有找到目标章节，加载第一页
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
        currentGroup.value = groupPathWord
        currentPage.value = 1 // 重置页码
        groupLoading.value = true
        await loadGroupChapters(groupPathWord, 1).finally(() => {
            groupLoading.value = false
        })
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
        if (activeKey && (Array.isArray(activeKey) ? activeKey.includes('comments') : activeKey === 'comments') &&
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

        await getMangaComments(manga.value.uuid, commentsPageSize.value, offset).then(res => {
            comments.value = res.results.list || []
            commentsTotal.value = res.results.total || 0
            commentsPage.value = page
            commentsLoaded.value = true
        }).catch(error => {
            console.error('获取评论失败:', error)
            message.error('获取评论失败')
        }).finally(() => {
            commentsLoading.value = false
        })
    }

    // 处理评论分页
    const handleCommentsPageChange = (page) => {
        fetchMangaComments(page)
    }

    // 提交评论
    const submitComment = async () => {
        const commentText = newComment.value.trim()

        if (commentText.length < 3) {
            message.warning('评论至少3个字')
            return
        }

        if (!isLoggedIn.value) {
            message.warning('请先登录')
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

    // 下载章节功能
    const downloadChapter = async (chapter, forceRedownload = false) => {
        // 检查是否已下载
        if (!forceRedownload && chapterDownloadStatus.value[chapter.id] === 'downloaded') {
            message.info('章节已下载')
            return
        }

        // 设置下载状态
        chapterDownloadStatus.value[chapter.id] = 'downloading'
        chapterDownloadProgress.value[chapter.id] = 0

        // 构建章节信息
        const chapterInfo = {
            comic_id: chapter.comic_id,
            group_path_word: chapter.group_path_word || 'default'
        }

        // 调用下载API
        return downloadChapterAPI(
            route.params.pathWord,
            chapter.id,
            chapterInfo,
            (progressInfo) => {
                // 更新进度
                chapterDownloadProgress.value[chapter.id] = progressInfo.percent || 0

                if (progressInfo.status === 'error') {
                    console.error('下载进度错误:', progressInfo.error)
                }
            }
        ).then(() => {
            // 下载完成
            chapterDownloadStatus.value[chapter.id] = 'downloaded'
            chapterDownloadProgress.value[chapter.id] = 100
            message.success(`章节 "${chapter.name}" 下载完成`)
        }).catch(error => {
            console.error('下载章节失败:', error)
            chapterDownloadStatus.value[chapter.id] = 'error'
            chapterDownloadProgress.value[chapter.id] = 0
            message.error(`下载失败: ${error.message || '未知错误'}`)
        })
    }

    // 批量下载功能
    const downloadCurrentPage = async () => {
        const chaptersToDownload = chapters.value.filter(chapter =>
            chapterDownloadStatus.value[chapter.id] !== 'downloaded'
        )

        if (chaptersToDownload.length === 0) {
            message.info('当前页所有章节都已下载')
            return
        }

        message.info(`开始批量下载 ${chaptersToDownload.length} 个章节`)

        for (const chapter of chaptersToDownload) {
            try {
                await downloadChapter(chapter)
                // 添加延迟避免过快的请求
                await new Promise(resolve => setTimeout(resolve, 1000))
            } catch (error) {
                console.error(`下载章节 ${chapter.name} 失败:`, error)
            }
        }
    }

    const downloadAllChapters = async () => {
        message.warning('下载全部章节功能暂未实现，请使用下载当前页功能')
    }

    const downloadNotDownloadedChapters = async () => {
        const chaptersToDownload = chapters.value.filter(chapter =>
            chapterDownloadStatus.value[chapter.id] !== 'downloaded'
        )

        if (chaptersToDownload.length === 0) {
            message.info('所有章节都已下载')
            return
        }

        message.info(`开始下载 ${chaptersToDownload.length} 个未下载的章节`)
        await downloadCurrentPage()
    }

    // 检查章节下载状态
    const checkChapterDownloadStatus = async (chapters) => {
        if (!manga.value?.uuid) {
            console.warn('漫画UUID为空，无法检查下载状态')
            return
        }

        // 使用 Promise.all 并行检查所有章节的下载状态
        const checkPromises = chapters.map(async (chapter) => {
            try {
                const isDownloaded = await downloadManager.isChapterDownloaded(
                    manga.value.uuid,
                    chapter.group_path_word || 'default',
                    chapter.uuid
                )

                if (isDownloaded) {
                    chapterDownloadStatus.value[chapter.id] = 'downloaded'
                    // console.log('设置章节状态为已下载:', chapter.name, 'ID:', chapter.id)
                }

                return isDownloaded
            } catch (error) {
                console.error('检查章节下载状态失败:', chapter.name, error)
                return false
            }
        })

        await Promise.all(checkPromises)
    }

    // 删除章节功能
    const deleteChapter = async (chapter) => {
        const groupPathWord = chapter.group_path_word || 'default'

        await downloadManager.deleteChapter(
            manga.value.uuid,
            groupPathWord,
            chapter.uuid
        ).then(() => {
            // 更新下载状态
            delete chapterDownloadStatus.value[chapter.id]
            delete chapterDownloadProgress.value[chapter.id]
            message.success(`章节 "${chapter.name}" 删除成功`)
        }).catch(error => {
            console.error('删除章节失败:', error)
            message.error(`删除失败: ${error.message || '未知错误'}`)
        })
    }

    // 初始化函数
    const initializePage = () => {
        // 检查是否来自书架
        if (route.query.from === 'collection') {
            fromCollection.value = true
            try {
                lastBrowseInfo.value = JSON.parse(route.query.lastBrowse)
            } catch (e) {
                console.warn('解析上次阅读信息失败:', e)
                lastBrowseInfo.value = null
            }
        }

        fetchMangaData()
    }

    return {
        // 响应式状态
        manga,
        chapters,
        loading,
        detailLoading,
        collectLoading,
        isAscending,
        groups,
        currentGroup,
        groupLoading,
        currentPage,
        pageSize,
        totalChapters,
        fromCollection,
        lastBrowseInfo,
        comments,
        commentsLoading,
        commentsActiveKey,
        commentsPage,
        commentsPageSize,
        commentsTotal,
        commentsLoaded,
        newComment,
        submitCommentLoading,
        chapterDownloadStatus,
        chapterDownloadProgress,

        // 计算属性
        isLoggedIn,
        sortedChapters,

        // 方法
        toggleSortOrder,
        goToChapter,
        goToAuthorPage,
        startReading,
        continueReading,
        isLastReadChapter,
        fetchMangaDetail,
        fetchMangaChapter,
        fetchMangaData,
        loadGroupChapters,
        findAndLoadPageWithChapter,
        handlePageChange,
        handleGroupChange,
        handleCollect,
        handleCommentsToggle,
        fetchMangaComments,
        handleCommentsPageChange,
        submitComment,
        downloadChapter,
        downloadCurrentPage,
        downloadAllChapters,
        downloadNotDownloadedChapters,
        checkChapterDownloadStatus,
        deleteChapter,
        initializePage
    }
}
