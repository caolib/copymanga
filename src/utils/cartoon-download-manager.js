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

        console.log('开始下载动画章节:', chapterName, '断点续传:', resumeDownload)

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

            console.log('动画下载完成:', chapterKey)
            return result
        } catch (error) {
            // 停止进度监控
            this.stopProgressMonitoring(cartoonUuid, chapterUuid)
            // 从活跃下载列表移除
            this.activeDownloads.delete(chapterKey)
            console.error('动画下载失败:', error)
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
                console.log('检测到章节已暂停，停止进度监控:', chapterKey)
                this.stopProgressMonitoring(cartoonUuid, chapterUuid)
                return
            } try {
                const progress = await invoke('get_cartoon_download_progress', {
                    cartoonUuid,
                    chapterUuid
                })

                console.log('动画下载进度:', progress) // 添加调试日志

                // 处理进度数据，使用后端返回的进度信息
                const percent = progress.percent || 0

                onProgress({
                    percent: Math.min(percent, 100), // 确保不超过100%
                    currentFile: progress.current_file || '下载中...',
                    status: progress.status || 'downloading',
                    downloadedSize: progress.downloaded_size || 0,
                    totalSize: progress.total_size || 0
                })

                // 如果下载完成或出错，停止监控
                if (progress.completed || progress.status === 'completed' || progress.status === 'error' || progress.status === 'paused') {
                    this.stopProgressMonitoring(cartoonUuid, chapterUuid)
                }
            } catch (error) {
                console.error('检查动画下载进度失败:', error)
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

            console.log('暂停动画下载成功:', chapterKey)
        } catch (error) {
            console.error('暂停动画下载失败:', error)
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

            console.log('继续动画下载成功:', chapterKey)
        } catch (error) {
            console.error('继续动画下载失败:', error)
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
            console.error('获取本地动画章节失败:', error)
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
            console.log('删除动画章节成功:', `${cartoonUuid}|${chapterUuid}`)
            return result
        } catch (error) {
            console.error('删除动画章节失败:', error)
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
            console.error('获取本地动画详情失败:', error)
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
            console.error('打开本地视频目录失败:', error)
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
            console.error('获取已下载动画列表失败:', error)
            throw error
        }
    }
}

// 创建单例实例
export const cartoonDownloadManager = new CartoonDownloadManager()
