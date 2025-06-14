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

    // 使用默认的 asset 协议
    const result = convertFileSrc(cleanPath)

    return result
}

/**
 * 下载管理器类 - 只通过 Tauri 后端处理下载
 */
export class DownloadManager {
    constructor() {
        this.downloadQueue = []
        this.activeDownloads = new Map()
        this.maxConcurrentDownloads = 3
    }    /**
     * 下载章节的所有图片 - 通过 Tauri 后端处理
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     */    async downloadChapter(chapterInfo, onProgress) {
        const {
            mangaUuid,
            mangaName,
            groupPathWord = 'default',
            chapterUuid,
            chapterName,
            images
        } = chapterInfo

        console.log('开始下载章节:', chapterName, '图片数量:', images.length)

        let progressInterval = null

        try {
            // 开始进度回调
            if (onProgress) {
                onProgress({
                    completed: 0,
                    total: images.length,
                    percent: 0,
                    currentImage: '准备下载...',
                    status: 'starting'
                })
            }

            // 启动进度监控定时器
            if (onProgress) {
                progressInterval = setInterval(async () => {
                    try {
                        // 检查当前已下载的图片数量
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

                        // 如果下载完成，停止监控
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
                    } catch (error) {
                        console.error('检查下载进度失败:', error)
                    }
                }, 1000) // 每秒检查一次
            }

            // 调用 Rust 后端下载命令
            await invoke('download_chapter', {
                mangaUuid,
                mangaName,
                groupPathWord,
                chapterUuid,
                chapterName,
                images: images.map((img, index) => ({
                    url: img.url,
                    index: index,
                    filename: `${String(index + 1).padStart(3, '0')}.jpg`
                }))
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
    /**
     * 检查章节是否已下载 - 通过 Tauri 后端检查
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */
    async isChapterDownloaded(mangaUuid, groupPathWord, chapterUuid) {
        try {
            // console.log('检查章节下载状态 - 漫画UUID:', mangaUuid, '分组:', groupPathWord, '章节UUID:', chapterUuid)

            const result = await invoke('check_chapter_downloaded', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })

            // console.log('后端返回结果:', result)

            const isDownloaded = result.is_downloaded || false
            // console.log('章节是否已下载:', isDownloaded)

            return isDownloaded
        } catch (error) {
            console.error('检查章节下载状态失败:', error)
            return false
        }
    }
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

            return result.images || []
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
}

// 创建单例实例
export const downloadManager = new DownloadManager()
