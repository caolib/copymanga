import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * 安全的文件路径转换函数 - 处理Windows路径问题
 * @param {string} path 本地文件路径
 * @returns {string} 转换后的URL
 */
function safeConvertFileSrc(path) {
    // 移除 Windows UNC 前缀 \\?\
    let cleanPath = path.replace(/^\\\\\?\\/, '')

    // 规范化路径分隔符为正斜杠
    cleanPath = cleanPath.replace(/\\/g, '/')

    return convertFileSrc(cleanPath)
}

/**
 * 下载管理器类 - 只通过 Tauri 后端处理下载
 */
export class DownloadManager {
    constructor() {
        this.downloadQueue = []
        this.activeDownloads = new Map()
        this.pausedDownloads = new Map() // 暂停的下载
        this.maxConcurrentDownloads = 3
    }

    /**
     * 下载章节的所有图片 - 通过 Tauri 后端处理
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     * @param {boolean} resumeDownload 是否为断点续传
     */
    async downloadChapter(chapterInfo, onProgress, resumeDownload = false) {
        const {
            mangaUuid,
            mangaName,
            groupPathWord = 'default',
            chapterUuid,
            chapterName,
            images,
            mangaDetail // 新增漫画详情参数
        } = chapterInfo

        const chapterKey = `${mangaUuid}|${groupPathWord}|${chapterUuid}`

        console.log('开始下载章节:', chapterName, '图片数量:', images.length, '断点续传:', resumeDownload)

        let progressInterval = null

        try {
            // 如果不是断点续传，检查是否有未完成的下载
            if (!resumeDownload) {
                const incompleteCheck = await this.checkIncompleteDownload(mangaUuid, groupPathWord, chapterUuid)
                if (incompleteCheck.hasIncomplete) {
                    console.log('发现未完成的下载，建议续传')
                    // 可以通过回调告知上层有未完成下载
                    if (onProgress) {
                        onProgress({
                            completed: incompleteCheck.completed || 0,
                            total: images.length,
                            percent: Math.floor(((incompleteCheck.completed || 0) / images.length) * 100),
                            currentImage: '发现未完成下载',
                            status: 'incomplete_found'
                        })
                    }
                }
            }

            // 添加到活跃下载列表
            this.activeDownloads.set(chapterKey, chapterInfo)

            // 开始进度回调
            if (onProgress) {
                onProgress({
                    completed: 0,
                    total: images.length,
                    percent: 0,
                    currentImage: resumeDownload ? '继续下载...' : '准备下载...',
                    status: resumeDownload ? 'resuming' : 'starting'
                })
            }

            // 启动进度监控定时器 - 使用新的进度查询API
            if (onProgress) {
                progressInterval = setInterval(async () => {
                    try {
                        // 使用新的进度查询API获取准确进度
                        const progress = await invoke('get_download_progress', {
                            mangaUuid,
                            groupPathWord,
                            chapterUuid,
                            expectedImageCount: images.length
                        })

                        onProgress({
                            completed: progress.completed,
                            total: progress.total,
                            percent: Math.floor(progress.percent),
                            currentImage: progress.current_image,
                            status: progress.status
                        })

                        // 如果下载完成，停止监控
                        if (progress.status === 'completed' || progress.completed >= images.length) {
                            clearInterval(progressInterval)
                            progressInterval = null
                            onProgress({
                                completed: images.length,
                                total: images.length,
                                percent: 100,
                                currentImage: '下载完成',
                                status: 'completed'
                            })
                        }
                    } catch (error) {
                        console.error('检查下载进度失败:', error)
                        // 如果新API失败，回退到文件系统检查
                        try {
                            const downloadedImages = await this.getLocalChapterImages(mangaUuid, groupPathWord, chapterUuid)
                            const completed = downloadedImages.length
                            const percent = Math.floor((completed / images.length) * 100)

                            onProgress({
                                completed,
                                total: images.length,
                                percent,
                                currentImage: `正在下载 ${completed}/${images.length}`,
                                status: 'downloading'
                            })

                            if (completed >= images.length) {
                                clearInterval(progressInterval)
                                progressInterval = null
                                onProgress({
                                    completed: images.length,
                                    total: images.length,
                                    percent: 100,
                                    currentImage: '下载完成',
                                    status: 'completed'
                                })
                            }
                        } catch (fallbackError) {
                            console.error('回退进度检查也失败:', fallbackError)
                        }
                    }
                }, 500) // 每500ms检查一次，提高响应性
            }            // 调用 Rust 后端下载命令
            await invoke('download_chapter', {
                mangaUuid,
                mangaName,
                groupPathWord,
                chapterUuid,
                chapterName,
                totalImages: chapterInfo.totalImages || images.length, // 添加总图片数量
                images: images.map((img, index) => ({
                    url: img.url,
                    index: index,
                    filename: `${String(index + 1).padStart(3, '0')}.jpg`
                })),
                mangaDetail: mangaDetail || null // 传递漫画详情
            })

            // 清除定时器
            if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
            }

            // 最终检查并完成进度回调
            if (onProgress) {
                const finalImages = await this.getLocalChapterImages(mangaUuid, groupPathWord, chapterUuid)
                onProgress({
                    completed: finalImages.length,
                    total: images.length,
                    percent: 100,
                    currentImage: '下载完成',
                    status: 'completed'
                })
            }

            return {
                success: true,
                totalImages: images.length,
                message: `章节 "${chapterName}" 下载完成`
            }
        } catch (error) {
            console.error('下载章节失败:', error)

            // 确保清除定时器
            if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
            }

            if (onProgress) {
                onProgress({
                    completed: 0,
                    total: images.length,
                    percent: 0,
                    currentImage: '下载失败',
                    status: 'error',
                    error: error.message
                })
            }
            throw error
        }
    }
    // 删除 isChapterDownloaded - 请使用 getLocalMangaChapters 批量获取本地章节
    /**
   * 获取本地章节图片列表 - 通过 Tauri 后端获取
   * @param {string} mangaUuid 漫画UUID
   * @param {string} groupPathWord 分组路径
   * @param {string} chapterUuid 章节UUID
   */
    async getLocalChapterImages(mangaUuid, groupPathWord, chapterUuid) {
        try {
            const result = await invoke('get_local_chapter_images', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })

            // 后端直接返回字符串数组，不是包含images字段的对象
            return result || []
        } catch (error) {
            console.error('获取本地章节图片失败:', error)
            return []
        }
    }

    /**
     * 转换本地文件路径为 Tauri 可访问的 URL
     * @param {string} filePath 本地文件路径
     * @returns {string} 转换后的 URL
     */
    convertLocalFileToUrl(filePath) {
        return safeConvertFileSrc(filePath)
    }    /**
     * 删除已下载的章节
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */
    async deleteChapter(mangaUuid, groupPathWord, chapterUuid) {
        try {
            const result = await invoke('delete_downloaded_chapter', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })

            if (result.success) {
                console.log('章节删除成功:', result.message)
                return true
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('删除章节失败:', error)
            throw error
        }
    }

    /**
     * 获取下载统计信息
     */
    async getDownloadStats() {
        try {
            return await invoke('get_download_stats')
        } catch (error) {
            console.error('获取下载统计失败:', error)
            return {
                totalMangas: 0,
                totalChapters: 0,
                totalImages: 0,
                totalSize: 0
            }
        }
    }

    /**
     * 清理无效的下载数据
     */
    async cleanupDownloads() {
        try {
            return await invoke('cleanup_downloads')
        } catch (error) {
            console.error('清理下载数据失败:', error)
            throw error
        }
    }

    /**
     * 获取已下载的漫画列表
     * @returns {Promise<Array>}
     */
    async getDownloadedMangaList() {
        try {
            const result = await invoke('get_downloaded_manga_list')

            // 处理返回的数据，转换封面图片路径为可访问的URL
            return result.map(manga => ({
                ...manga,
                coverUrl: manga.coverPath ? this.convertLocalFileToUrl(manga.coverPath) : null
            }))
        } catch (error) {
            console.error('获取已下载漫画列表失败:', error)
            return []
        }
    }    /**
     * 获取本地漫画详情
     * @param {string} mangaUuid 漫画UUID
     * @returns {Promise<Object|null>}
     */
    async getLocalMangaDetail(mangaUuid) {
        try {
            const result = await invoke('get_local_manga_detail', { mangaUuid })

            if (result) {
                // 后端直接返回漫画详情对象，不需要解包
                const mangaDetail = {
                    ...result,
                    coverUrl: result.coverPath ? this.convertLocalFileToUrl(result.coverPath) : null
                }
                return mangaDetail
            }

            return null
        } catch (error) {
            console.error('DownloadManager: 获取本地漫画详情失败:', error)
            throw error // 向上抛出错误，而不是返回null
        }
    }    /**
     * 获取本地漫画的章节列表
     * @param {string} mangaUuid 漫画UUID
     * @returns {Promise<Array>}
     */
    async getLocalMangaChapters(mangaUuid) {
        try {
            const result = await invoke('get_local_manga_chapters', { mangaUuid })
            return result || []
        } catch (error) {
            console.error('DownloadManager: 获取本地漫画章节列表失败:', error)
            throw error // 向上抛出错误
        }
    }

    /**
     * 暂停下载
     * @param {string} mangaUuid 漫画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async pauseDownload(mangaUuid, chapterUuid) {
        const chapterKey = `${mangaUuid}|default|${chapterUuid}`

        try {
            await invoke('pause_chapter_download', {
                mangaUuid,
                groupPathWord: 'default',
                chapterUuid
            })

            // 将下载信息移到暂停列表
            if (this.activeDownloads.has(chapterKey)) {
                this.pausedDownloads.set(chapterKey, this.activeDownloads.get(chapterKey))
                this.activeDownloads.delete(chapterKey)
            }

            console.log('暂停下载成功:', chapterKey)
        } catch (error) {
            console.error('暂停下载失败:', error)
            throw error
        }
    }

    /**
     * 继续下载
     * @param {string} mangaUuid 漫画UUID  
     * @param {string} chapterUuid 章节UUID
     */
    async resumeDownload(mangaUuid, chapterUuid) {
        const chapterKey = `${mangaUuid}|default|${chapterUuid}`

        try {
            await invoke('resume_chapter_download', {
                mangaUuid,
                groupPathWord: 'default',
                chapterUuid
            })

            // 将下载信息移回活跃列表
            if (this.pausedDownloads.has(chapterKey)) {
                this.activeDownloads.set(chapterKey, this.pausedDownloads.get(chapterKey))
                this.pausedDownloads.delete(chapterKey)
            }

            console.log('继续下载成功:', chapterKey)
        } catch (error) {
            console.error('继续下载失败:', error)
            throw error
        }
    }

    /**
     * 检查是否有未完成的下载可以续传
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */
    async checkIncompleteDownload(mangaUuid, groupPathWord, chapterUuid) {
        try {
            const result = await invoke('check_incomplete_download', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })
            return result
        } catch (error) {
            console.error('检查未完成下载失败:', error)
            return { hasIncomplete: false }
        }
    }

    /**
     * 检查章节下载的详细状态
     * @param {string} mangaUuid 漫画UUID
     * @param {string} chapterUuid 章节UUID
     * @param {string} groupPathWord 分组路径
     */
    async checkChapterDownloadDetail(mangaUuid, chapterUuid, groupPathWord = 'default') {
        try {
            const result = await invoke('check_chapter_download_detail', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })
            return result
        } catch (error) {
            console.error('检查章节下载详细状态失败:', error)
            throw error
        }
    }

    /**
     * 启动进度监控
     */
    startProgressMonitoring(chapterInfo, onProgress) {
        const { mangaUuid, groupPathWord, chapterUuid, images } = chapterInfo

        const progressInterval = setInterval(async () => {
            try {
                const progress = await invoke('get_download_progress', {
                    mangaUuid,
                    groupPathWord,
                    chapterUuid,
                    expectedImageCount: images.length
                })

                onProgress({
                    completed: progress.completed,
                    total: progress.total,
                    percent: Math.floor(progress.percent),
                    currentImage: progress.current_image,
                    status: progress.status
                })

                // 如果下载完成或暂停，停止监控
                if (progress.status === 'completed' || progress.status === 'paused') {
                    clearInterval(progressInterval)
                }
            } catch (error) {
                console.error('检查下载进度失败:', error)
                clearInterval(progressInterval)
            }
        }, 1000)

        return progressInterval
    }
}

// 创建单例实例
export const downloadManager = new DownloadManager()
