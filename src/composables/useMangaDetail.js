import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMangaDetail, collectManga, getMangaGroupChapters, downloadChapter as downloadChapterAPI, getChapterImages } from '../api/manga'
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
    const chapterDownloadStatus = ref({}) // 章节下载状态：'downloading', 'downloaded', 'partial', 'error', 'paused'
    const chapterDownloadProgress = ref({}) // 章节下载进度
    const chapterUuidMapping = ref({}) // 章节ID -> { mangaUuid, chapterUuid } 映射，用于暂停/继续功能

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

        // 先获取章节详情以获得正确的UUID信息，用于后续的暂停/继续功能
        try {
            const chapterResponse = await getChapterImages(route.params.pathWord, chapter.id)
            const actualMangaUuid = chapterResponse.results.comic.uuid
            const actualChapterUuid = chapterResponse.results.chapter.uuid

            // 存储UUID映射，供暂停/继续功能使用
            chapterUuidMapping.value[chapter.id] = {
                mangaUuid: actualMangaUuid,
                chapterUuid: actualChapterUuid
            }

            // 构建章节信息，包含漫画详情
            const chapterInfo = {
                comic_id: chapter.comic_id,
                group_path_word: chapter.group_path_word || 'default',
                // 传递当前页面的漫画详情信息用于保存到本地
                mangaDetail: manga.value ? {
                    uuid: manga.value.uuid,
                    name: manga.value.name,
                    cover: manga.value.cover || '',
                    author: manga.value.author ? manga.value.author.map(a => a.name || a) : [],
                    theme: manga.value.theme ? manga.value.theme.map(t => t.name || t) : [],
                    status: manga.value.status?.display || null,
                    popular: manga.value.popular || null,
                    brief: manga.value.brief || null,
                    datetime_updated: manga.value.datetime_updated || null,
                    path_word: route.params.pathWord // 添加当前的path_word
                } : null
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
                // 下载函数执行完成，但需要检查实际状态（可能是完成、暂停或部分下载）
                console.log(`章节 "${chapter.name}" 下载函数执行完成，正在检查实际状态...`)

                // 重新检查章节的真实下载状态
                checkChapterDownloadStatus([chapter]).then(() => {
                    // 根据检查结果显示不同的消息
                    const finalStatus = chapterDownloadStatus.value[chapter.id]
                    if (finalStatus === 'downloaded') {
                        message.success({
                            content: () => `章节 "${chapter.name}" 下载完成`,
                            class: 'right-bottom-msg'
                        });
                        console.log(`章节 "${chapter.name}" 下载完成`)
                    } else if (finalStatus === 'partial') {
                        const progress = chapterDownloadProgress.value[chapter.id] || 0
                        message.info({
                            content: () => `章节 "${chapter.name}" 已暂停，进度 ${Math.round(progress)}%`,
                            class: 'right-bottom-msg'
                        });
                        console.log(`章节 "${chapter.name}" 下载已暂停，进度 ${progress}%`)
                    }
                }).catch(statusError => {
                    console.error('检查章节状态失败:', statusError)
                    // 如果状态检查失败，回退到默认行为
                    chapterDownloadStatus.value[chapter.id] = 'downloaded'
                    chapterDownloadProgress.value[chapter.id] = 100
                })
            }).catch(error => {
                console.error('下载章节失败:', error)
                chapterDownloadStatus.value[chapter.id] = 'error'
                chapterDownloadProgress.value[chapter.id] = 0
                message.error(`下载失败: ${error.message || '未知错误'}`)
            })
        } catch (error) {
            console.error('获取章节信息失败:', error)
            chapterDownloadStatus.value[chapter.id] = 'error'
            chapterDownloadProgress.value[chapter.id] = 0
            message.error(`下载失败: ${error.message || '未知错误'}`)
        }
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

        try {
            // 先批量获取所有已下载的章节
            const { getLocalMangaChapters, checkChapterDownloadDetail } = await import('../api/manga')
            const localChapters = await getLocalMangaChapters(manga.value.uuid)

            // 创建一个已下载章节的 Set，用于快速查找
            const downloadedChapterUuids = new Set(localChapters.map(chapter => chapter.chapter_uuid))

            let downloadedCount = 0
            let partialCount = 0

            // 只对已下载的章节进行详细状态检查
            const detailCheckPromises = []

            for (const chapter of chapters) {
                if (downloadedChapterUuids.has(chapter.uuid)) {
                    // 这个章节已下载，需要检查是否完整
                    detailCheckPromises.push(
                        checkChapterDownloadDetail(manga.value.uuid, chapter.uuid)
                            .then(detail => ({
                                chapterId: chapter.id,
                                detail
                            }))
                            .catch(error => {
                                console.error(`检查章节 ${chapter.name} 详细状态失败:`, error)
                                return {
                                    chapterId: chapter.id,
                                    detail: { status: 'downloaded', progress: 100 } // 默认为已下载
                                }
                            })
                    )
                } else {
                    // 这个章节未下载
                    chapterDownloadStatus.value[chapter.id] = undefined
                }
            }

            // 等待所有详细检查完成
            const detailResults = await Promise.all(detailCheckPromises)

            // 更新已下载章节的详细状态
            for (const result of detailResults) {
                const { chapterId, detail } = result

                if (detail.status === 'downloaded') {
                    chapterDownloadStatus.value[chapterId] = 'downloaded'
                    downloadedCount++
                } else if (detail.status === 'partial') {
                    chapterDownloadStatus.value[chapterId] = 'partial'
                    chapterDownloadProgress.value[chapterId] = detail.progress
                    partialCount++
                } else {
                    // 其他状态当作未下载处理
                    chapterDownloadStatus.value[chapterId] = undefined
                }
            }

            console.log(`下载状态检查完成: 已下载 ${downloadedCount} 章, 部分下载 ${partialCount} 章`)
        } catch (error) {
            console.error('批量检查章节下载状态失败:', error)
        }
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

    // 暂停下载功能
    const pauseDownload = async (chapter) => {
        try {
            // 先设置为暂停中的状态，避免界面闪烁
            chapterDownloadStatus.value[chapter.id] = 'pausing'

            // 使用存储的UUID映射，确保与下载时使用的UUID一致
            const uuidMapping = chapterUuidMapping.value[chapter.id]

            if (!uuidMapping) {
                // 如果没有UUID映射，说明还没开始下载，或者是老的下载任务
                // 回退到通过API获取UUID的方式
                const chapterResponse = await getChapterImages(route.params.pathWord, chapter.id)
                const actualMangaUuid = chapterResponse.results.comic.uuid
                const actualChapterUuid = chapterResponse.results.chapter.uuid

                await downloadManager.pauseDownload(actualMangaUuid, actualChapterUuid)
            } else {
                // 使用存储的UUID映射
                await downloadManager.pauseDownload(uuidMapping.mangaUuid, uuidMapping.chapterUuid)
            }

            // 暂停成功后，重新检查章节的实际下载状态
            await checkChapterDownloadStatus([chapter])

            message.info(`章节 "${chapter.name}" 下载已暂停`)
        } catch (error) {
            console.error('暂停下载失败:', error)
            // 如果暂停失败，恢复为下载中状态
            chapterDownloadStatus.value[chapter.id] = 'downloading'
            message.error(`暂停下载失败: ${error.message || '未知错误'}`)
        }
    }

    // 继续下载功能
    const resumeDownload = async (chapter) => {
        try {
            chapterDownloadStatus.value[chapter.id] = 'downloading'
            await downloadChapter(chapter, false) // 断点续传
        } catch (error) {
            console.error('继续下载失败:', error)
            chapterDownloadStatus.value[chapter.id] = 'paused'
            message.error(`继续下载失败: ${error.message || '未知错误'}`)
        }
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
        initializePage,
        pauseDownload,
        resumeDownload
    }
}
