import { invoke } from '@tauri-apps/api/core'
import { convertLocalFileToUrl } from './file-converter'

/**
 * 动画下载管理器类
 */
export class CartoonDownloadManager {
    constructor() {
        this.activeDownloads = new Map()
        this.pausedDownloads = new Map()
        this.progressIntervals = new Map() // 添加进度监控管理
        this.progressData = new Map() // 存储实时进度数据
        this.progressTexts = new Map() // 存储进度文本
        this.downloadSizes = new Map() // 存储下载大小信息 {downloadedSize, totalSize}
        this.initialized = false // 标记是否已初始化
    }

    /**
     * 初始化下载管理器，恢复正在进行的下载任务
     */
    async initialize() {
        if (this.initialized) {
            return
        }

        try {
            // console.log('初始化下载管理器，恢复下载任务状态...')

            // 从后端获取正在进行的下载任务
            const activeTasks = await invoke('get_active_download_tasks')

            for (const task of activeTasks) {
                const key = `${task.cartoon_uuid}|${task.chapter_uuid}`

                const taskInfo = {
                    cartoonUuid: task.cartoon_uuid,
                    cartoonName: task.cartoon_name,
                    chapterUuid: task.chapter_uuid,
                    chapterName: task.chapter_name,
                    videoUrl: task.video_url,
                    cover: task.cover,
                    cartoonDetail: task.cartoon_detail,
                    startTime: task.start_time
                }

                // 检查任务进度，如果已完成则自动清理
                if (task.progress >= 100 || task.status === 'completed') {
                    // console.log(`发现已完成任务 ${task.chapter_name}，自动清理`)
                    try {
                        await this.removeTask(task.cartoon_uuid, task.chapter_uuid)
                    } catch (error) {
                        // console.error('清理完成任务失败:', error)
                    }
                    continue
                }

                // 根据任务状态恢复到对应的Map
                if (task.status === 'downloading') {
                    this.activeDownloads.set(key, taskInfo)
                    // 恢复进度监控
                    this.startProgressMonitoring(task.cartoon_uuid, task.chapter_uuid, (progressInfo) => {
                        this.progressData.set(key, progressInfo.percent || 0)
                        this.progressTexts.set(key, progressInfo.current_file || progressInfo.currentFile || '下载中...')
                        this.downloadSizes.set(key, {
                            downloadedSize: progressInfo.downloadedSize || 0,
                            totalSize: progressInfo.totalSize || 0
                        })
                    })
                } else if (task.status === 'paused') {
                    this.pausedDownloads.set(key, taskInfo)
                    this.progressData.set(key, task.progress || 0)
                    this.progressTexts.set(key, '已暂停')
                    this.downloadSizes.set(key, {
                        downloadedSize: 0,
                        totalSize: 0
                    })
                }
            }

            this.initialized = true
            // console.log(`下载管理器初始化完成，恢复了 ${activeTasks.length} 个任务`)

        } catch (error) {
            // console.error('初始化下载管理器失败:', error)
            this.initialized = true // 即使失败也标记为已初始化，避免重复尝试
        }
    }

    /**
     * 下载动画章节
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     * @param {boolean} resumeDownload 是否为断点续传
     */    async downloadChapter(chapterInfo, onProgress, resumeDownload = false) {
        const {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cover,
            cartoonDetail
        } = chapterInfo

        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        // console.log('开始下载动画章节:', chapterName, '断点续传:', resumeDownload)

        try {
            // 检查是否暂停（只在非断点续传时检查）
            if (!resumeDownload && this.pausedDownloads.has(chapterKey)) {
                throw new Error('下载已暂停')
            }

            // 如果是断点续传，从暂停列表移到活跃列表
            if (resumeDownload && this.pausedDownloads.has(chapterKey)) {
                this.activeDownloads.set(chapterKey, this.pausedDownloads.get(chapterKey))
                this.pausedDownloads.delete(chapterKey)
            } else {
                // 添加到活跃下载列表
                this.activeDownloads.set(chapterKey, chapterInfo)
            }

            // 开始进度回调
            if (onProgress) {
                onProgress({
                    percent: 0,
                    currentFile: resumeDownload ? '继续下载...' : '准备下载...',
                    status: resumeDownload ? 'resuming' : 'starting'
                })
            }            // 启动进度监控
            let progressInterval = null
            if (onProgress) {
                progressInterval = this.startProgressMonitoring(cartoonUuid, chapterUuid, onProgress)
            }            // 调用后端下载API
            const result = await invoke('download_cartoon_chapter', {
                cartoonUuid,
                cartoonName,
                chapterUuid,
                chapterName,
                videoUrl,
                videoFile: chapterInfo.videoFile || `${chapterName}.mp4`,
                fileSize: chapterInfo.fileSize || 0,
                cover: chapterInfo.cover,
                cartoonDetail
            })            // 停止进度监控
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)

            // 从活跃下载列表移除
            this.activeDownloads.delete(chapterKey)

            // console.log('动画下载完成:', chapterKey)
            return result
        } catch (error) {
            // 停止进度监控
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)
            // 从活跃下载列表移除
            this.activeDownloads.delete(chapterKey)
            // console.error('动画下载失败:', error)
            throw error
        }
    }    /**
     * 启动进度监控
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @param {Function} onProgress 进度回调
     */
    startProgressMonitoring(cartoonUuid, chapterUuid, onProgress) {
        const chapterKey = `${cartoonUuid}|${chapterUuid}`
        // 先停止已有的进度监控
        this.stopProgressMonitoring(cartoonUuid, chapterUuid)

        const intervalId = setInterval(async () => {
            // 检查是否已经被暂停（前端状态检查）
            if (this.pausedDownloads.has(chapterKey)) {
                // console.log('检测到章节已暂停，停止进度监控:', chapterKey)
                this.stopProgressMonitoring(cartoonUuid, chapterUuid)
                return
            } try {
                const progress = await invoke('get_cartoon_download_progress', {
                    cartoonUuid,
                    chapterUuid
                })

                // console.log('动画下载进度:', progress) // 添加调试日志

                // 存储进度数据
                const key = `${cartoonUuid}|${chapterUuid}`
                this.progressData.set(key, progress.percent || 0)
                this.progressTexts.set(key, progress.current_file || '下载中...')
                this.downloadSizes.set(key, {
                    downloadedSize: progress.downloaded_size || 0,
                    totalSize: progress.total_size || 0
                })

                // 处理进度数据，使用后端返回的进度信息
                const percent = progress.percent || 0

                onProgress({
                    percent: Math.min(percent, 100), // 确保不超过100%
                    currentFile: progress.current_file || '下载中...',
                    status: progress.status || 'downloading',
                    downloadedSize: progress.downloaded_size || 0,
                    totalSize: progress.total_size || 0
                })

                // 如果下载完成或出错，停止监控并处理任务状态
                if (progress.completed || progress.status === 'completed' || progress.percent >= 100) {
                    // console.log(`任务 ${cartoonUuid}|${chapterUuid} 下载完成，自动清理`)
                    this.stopProgressMonitoring(cartoonUuid, chapterUuid)
                    // 自动清理已完成的任务
                    await this.removeTask(cartoonUuid, chapterUuid)
                } else if (progress.status === 'error' || progress.status === 'paused') {
                    this.stopProgressMonitoring(cartoonUuid, chapterUuid)
                }
            } catch (error) {
                // console.error('检查动画下载进度失败:', error)
                this.stopProgressMonitoring(cartoonUuid, chapterUuid)
            }
        }, 1000)

        // 保存定时器ID
        this.progressIntervals.set(chapterKey, intervalId)
        return intervalId
    }

    /**
     * 停止进度监控
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    stopProgressMonitoring(cartoonUuid, chapterUuid) {
        const chapterKey = `${cartoonUuid}|${chapterUuid}`
        const intervalId = this.progressIntervals.get(chapterKey)

        if (intervalId) {
            clearInterval(intervalId)
            this.progressIntervals.delete(chapterKey)
        }
    }    /**
     * 暂停下载
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async pauseDownload(cartoonUuid, chapterUuid) {
        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        try {
            // 先停止进度监控
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)

            // 调用后端暂停命令
            await invoke('pause_cartoon_download', {
                cartoonUuid,
                chapterUuid
            })

            // 将下载信息移到暂停列表
            if (this.activeDownloads.has(chapterKey)) {
                this.pausedDownloads.set(chapterKey, this.activeDownloads.get(chapterKey))
                this.activeDownloads.delete(chapterKey)
            }

            // 更新后端任务状态
            try {
                await invoke('update_download_task_status', {
                    cartoonUuid,
                    chapterUuid,
                    status: 'paused'
                })
            } catch (error) {
                // console.error('更新任务状态失败:', error)
            }

            // console.log('暂停动画下载成功:', chapterKey)
        } catch (error) {
            // console.error('暂停动画下载失败:', error)
            throw error
        }
    }

    /**
     * 继续下载
     * @param {string} cartoonUuid 动画UUID  
     * @param {string} chapterUuid 章节UUID
     */
    async resumeDownload(cartoonUuid, chapterUuid) {
        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        try {
            await invoke('resume_cartoon_download', {
                cartoonUuid,
                chapterUuid
            })

            // 将下载信息移回活跃列表
            if (this.pausedDownloads.has(chapterKey)) {
                this.activeDownloads.set(chapterKey, this.pausedDownloads.get(chapterKey))
                this.pausedDownloads.delete(chapterKey)
            }

            // 更新后端任务状态
            try {
                await invoke('update_download_task_status', {
                    cartoonUuid,
                    chapterUuid,
                    status: 'downloading'
                })
            } catch (error) {
                // console.error('更新任务状态失败:', error)
            }

            // 重新启动进度监控
            this.startProgressMonitoring(cartoonUuid, chapterUuid, (progressInfo) => {
                this.progressData.set(chapterKey, progressInfo.percent || 0)
                this.progressTexts.set(chapterKey, progressInfo.current_file || progressInfo.currentFile || '下载中...')
                this.downloadSizes.set(chapterKey, {
                    downloadedSize: progressInfo.downloadedSize || 0,
                    totalSize: progressInfo.totalSize || 0
                })
            })

            // console.log('继续动画下载成功:', chapterKey)
        } catch (error) {
            // console.error('继续动画下载失败:', error)
            throw error
        }
    }

    /**
     * 获取本地动画章节列表
     * @param {string} cartoonUuid 动画UUID
     * @returns {Promise<Array>}
     */
    async getLocalCartoonChapters(cartoonUuid) {
        try {
            return await invoke('get_local_cartoon_chapters', {
                cartoonUuid
            })
        } catch (error) {
            // console.error('获取本地动画章节失败:', error)
            throw error
        }
    }

    /**
     * 删除已下载的动画章节
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @returns {Promise<boolean>}
     */
    async deleteChapter(cartoonUuid, chapterUuid) {
        try {
            const result = await invoke('delete_downloaded_cartoon_chapter', {
                cartoonUuid,
                chapterUuid
            })
            // console.log('删除动画章节成功:', `${cartoonUuid}|${chapterUuid}`)
            return result
        } catch (error) {
            // console.error('删除动画章节失败:', error)
            throw error
        }
    }

    /**
     * 删除整个本地动画（包括所有章节和详情）
     * @param {string} cartoonUuid 动画UUID
     * @returns {Promise<boolean>}
     */
    async deleteLocalCartoon(cartoonUuid) {
        try {
            const result = await invoke('delete_local_cartoon', {
                cartoonUuid
            })
            return result
        } catch (error) {
            console.error('删除本地动画失败:', error)
            throw error
        }
    }

    /**
     * 获取本地动画详情
     * @param {string} cartoonUuid 动画UUID
     * @returns {Promise<Object>}
     */
    async getLocalCartoonDetail(cartoonUuid) {
        try {
            return await invoke('get_local_cartoon_detail', {
                cartoonUuid
            })
        } catch (error) {
            // console.error('获取本地动画详情失败:', error)
            throw error
        }
    }

    /**
     * 打开本地视频目录
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async openLocalVideoDirectory(cartoonUuid, chapterUuid) {
        try {
            return await invoke('open_local_video_directory', {
                cartoonUuid,
                chapterUuid
            })
        } catch (error) {
            // console.error('打开本地视频目录失败:', error)
            throw error
        }
    }    /**
     * 获取已下载的动画列表
     * @returns {Promise<Array>}
     */
    async getDownloadedCartoonList() {
        try {
            const cartoonList = await invoke('get_downloaded_cartoon_list')

            // 转换封面路径为可显示的URL
            return cartoonList.map(cartoon => ({
                ...cartoon,
                coverUrl: convertLocalFileToUrl(cartoon.coverPath)
            }))
        } catch (error) {
            // console.error('获取已下载动画列表失败:', error)
            throw error
        }
    }

    /**
     * 获取活跃下载任务
     * @returns {Map}
     */
    async getActiveDownloads() {
        await this.initialize()
        return this.activeDownloads
    }

    /**
     * 获取暂停的下载任务
     * @returns {Map}
     */
    async getPausedDownloads() {
        await this.initialize()
        return this.pausedDownloads
    }

    /**
     * 获取下载进度
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @returns {number}
     */
    getProgress(cartoonUuid, chapterUuid) {
        const key = `${cartoonUuid}|${chapterUuid}`
        return this.progressData.get(key) || 0
    }

    /**
     * 获取下载进度文本
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @returns {string}
     */
    getProgressText(cartoonUuid, chapterUuid) {
        const key = `${cartoonUuid}|${chapterUuid}`
        return this.progressTexts.get(key) || '准备下载...'
    }

    /**
     * 获取下载大小信息
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @returns {object} {downloadedSize, totalSize}
     */
    getDownloadSizes(cartoonUuid, chapterUuid) {
        const key = `${cartoonUuid}|${chapterUuid}`
        return this.downloadSizes.get(key) || { downloadedSize: 0, totalSize: 0 }
    }

    /**
     * 删除任务
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async removeTask(cartoonUuid, chapterUuid) {
        const key = `${cartoonUuid}|${chapterUuid}`

        try {
            // 先停止下载（如果正在下载）
            if (this.activeDownloads.has(key)) {
                await invoke('cancel_cartoon_download', {
                    cartoonUuid,
                    chapterUuid
                })
            }

            // 从后端删除任务记录
            await invoke('remove_download_task', {
                cartoonUuid,
                chapterUuid
            })
        } catch (error) {
            // console.error('从后端删除任务失败:', error)
            // 即使后端删除失败，也继续清理前端状态
        }

        // 从活跃和暂停任务中移除
        this.activeDownloads.delete(key)
        this.pausedDownloads.delete(key)

        // 清理进度监控
        if (this.progressIntervals.has(key)) {
            clearInterval(this.progressIntervals.get(key))
            this.progressIntervals.delete(key)
        }

        // 清理进度数据
        this.progressData.delete(key)
        this.progressTexts.delete(key)
        this.downloadSizes.delete(key)

        // console.log(`任务 ${key} 已删除`)
    }

    /**
     * 添加下载任务
     * @param {Object} downloadInfo 下载信息
     */
    async addDownloadTask(downloadInfo) {
        await this.initialize() // 确保已初始化

        const {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cover,
            cartoonDetail,
            startTime
        } = downloadInfo

        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        // 检查是否已经在下载队列中
        if (this.activeDownloads.has(chapterKey) || this.pausedDownloads.has(chapterKey)) {
            throw new Error('该章节已在下载队列中')
        }

        // 添加到活跃下载列表，但不立即开始下载
        const taskInfo = {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cover,
            cartoonDetail,
            startTime: startTime || new Date().toISOString()
        }

        this.activeDownloads.set(chapterKey, taskInfo)

        // 设置初始进度
        this.progressData.set(chapterKey, 0)
        this.progressTexts.set(chapterKey, '准备下载...')
        this.downloadSizes.set(chapterKey, {
            downloadedSize: 0,
            totalSize: 0
        })

        try {
            // 将任务保存到后端存储
            await invoke('save_download_task', {
                cartoonUuid,
                cartoonName,
                chapterUuid,
                chapterName,
                videoUrl,
                cover: cover || '',
                cartoonDetail: cartoonDetail || {},
                status: 'downloading',
                progress: 0,
                startTime: taskInfo.startTime
            })
        } catch (error) {
            // console.error('保存下载任务到后端失败:', error)
            // 如果保存失败，也继续执行，只是任务不会被持久化
        }

        // console.log('下载任务已添加到队列:', chapterKey)

        // 立即开始下载（可以考虑后续添加队列管理）
        this.startDownload(downloadInfo)

        return { success: true, message: '任务已添加到下载队列' }
    }

    /**
     * 开始下载任务
     * @param {Object} downloadInfo 下载信息
     */
    async startDownload(downloadInfo) {
        const {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cover,
            cartoonDetail
        } = downloadInfo

        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        try {
            // 启动进度监控
            this.startProgressMonitoring(cartoonUuid, chapterUuid, (progressInfo) => {
                // 更新进度数据
                this.progressData.set(chapterKey, progressInfo.percent || 0)
                this.progressTexts.set(chapterKey, progressInfo.current_file || progressInfo.currentFile || '下载中...')
                this.downloadSizes.set(chapterKey, {
                    downloadedSize: progressInfo.downloadedSize || 0,
                    totalSize: progressInfo.totalSize || 0
                })

                // 检查是否下载完成
                if (progressInfo.status === 'completed' || progressInfo.percent >= 100) {
                    this.activeDownloads.delete(chapterKey)
                    // console.log('下载完成:', chapterKey)
                }
            })

            // 调用后端下载API
            const result = await invoke('download_cartoon_chapter', {
                cartoonUuid,
                cartoonName,
                chapterUuid,
                chapterName,
                videoUrl,
                videoFile: downloadInfo.videoFile || `${chapterName}.mp4`,
                fileSize: downloadInfo.fileSize || 0,
                cover,
                cartoonDetail
            })

            // 下载完成，从活跃列表移除
            this.activeDownloads.delete(chapterKey)
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)

            // console.log('动画下载完成:', chapterKey)
            return result
        } catch (error) {
            // 下载失败，从活跃列表移除
            this.activeDownloads.delete(chapterKey)
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)
            // console.error('动画下载失败:', error)
            throw error
        }
    }

    /**
     * 重置初始化状态，用于强制重新初始化
     */
    resetInitialization() {
        this.initialized = false
        this.activeDownloads.clear()
        this.pausedDownloads.clear()
        this.progressData.clear()
        this.progressTexts.clear()
        this.downloadSizes.clear()
        // 清理所有进度监控
        this.progressIntervals.forEach((intervalId) => {
            clearInterval(intervalId)
        })
        this.progressIntervals.clear()
    }
}

// 创建单例实例
export const cartoonDownloadManager = new CartoonDownloadManager()
