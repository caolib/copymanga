import { invoke } from '@tauri-apps/api/core'

/**
 * 动画下载管理器类
 */
export class CartoonDownloadManager {
    constructor() {
        this.activeDownloads = new Map()
        this.pausedDownloads = new Map()
    }

    /**
     * 下载动画章节
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     * @param {boolean} resumeDownload 是否为断点续传
     */
    async downloadChapter(chapterInfo, onProgress, resumeDownload = false) {
        const {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cartoonDetail
        } = chapterInfo

        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        console.log('开始下载动画章节:', chapterName, '断点续传:', resumeDownload)

        try {
            // 检查是否暂停
            if (this.pausedDownloads.has(chapterKey)) {
                throw new Error('下载已暂停')
            }

            // 添加到活跃下载列表
            this.activeDownloads.set(chapterKey, chapterInfo)

            // 开始进度回调
            if (onProgress) {
                onProgress({
                    percent: 0,
                    currentFile: resumeDownload ? '继续下载...' : '准备下载...',
                    status: resumeDownload ? 'resuming' : 'starting'
                })
            }

            // 启动进度监控
            let progressInterval = null
            if (onProgress) {
                progressInterval = this.startProgressMonitoring(cartoonUuid, chapterUuid, onProgress)
            }

            // 调用后端下载API
            const result = await invoke('download_cartoon_chapter', {
                cartoonUuid,
                cartoonName,
                chapterUuid,
                chapterName,
                videoUrl,
                cartoonDetail
            })

            // 停止进度监控
            if (progressInterval) {
                clearInterval(progressInterval)
            }

            // 从活跃下载列表移除
            this.activeDownloads.delete(chapterKey)

            return result
        } catch (error) {
            // 从活跃下载列表移除
            this.activeDownloads.delete(chapterKey)
            throw error
        }
    }

    /**
     * 启动进度监控
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     * @param {Function} onProgress 进度回调
     */
    startProgressMonitoring(cartoonUuid, chapterUuid, onProgress) {
        return setInterval(async () => {
            try {
                const progress = await invoke('get_cartoon_download_progress', {
                    cartoonUuid,
                    chapterUuid
                })

                onProgress({
                    percent: progress.percent,
                    currentFile: progress.current_file,
                    status: progress.status
                })

                // 如果下载完成或出错，停止监控
                if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'paused') {
                    clearInterval(this)
                }
            } catch (error) {
                console.error('检查动画下载进度失败:', error)
                clearInterval(this)
            }
        }, 1000)
    }

    /**
     * 暂停下载
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async pauseDownload(cartoonUuid, chapterUuid) {
        const chapterKey = `${cartoonUuid}|${chapterUuid}`

        try {
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
}

// 创建单例实例
export const cartoonDownloadManager = new CartoonDownloadManager()
