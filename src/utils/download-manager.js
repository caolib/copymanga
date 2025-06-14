import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * 安全的文件路径转换函数 - 处理Windows路径问题
 * @param {string} path 本地文件路径
 * @returns {string} 转换后的URL
 */
function safeConvertFileSrc(path) {
    // console.log('safeConvertFileSrc 输入路径:', path)

    // 移除 Windows UNC 前缀 \\?\
    let cleanPath = path.replace(/^\\\\\?\\/, '')

    // 规范化路径分隔符为正斜杠
    cleanPath = cleanPath.replace(/\\/g, '/')

    // console.log('清理后的路径:', cleanPath)

    // 使用默认的 asset 协议
    const result = convertFileSrc(cleanPath)
    console.log('safeConvertFileSrc 输出URL:', result)

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
    }

    /**
     * 下载章节的所有图片 - 通过 Tauri 后端处理
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     */
    async downloadChapter(chapterInfo, onProgress) {
        const {
            mangaUuid,
            mangaName,
            groupPathWord = 'default',
            chapterUuid,
            chapterName,
            images
        } = chapterInfo

        console.log('开始下载章节:', chapterName, '图片数量:', images.length)

        try {
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

            // 下载完成后的进度回调
            if (onProgress) {
                onProgress({
                    completed: images.length,
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
    }    /**
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
    }    /**
     * 获取本地章节图片列表 - 通过 Tauri 后端获取
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */
    async getLocalChapterImages(mangaUuid, groupPathWord, chapterUuid) {
        try {
            console.log('获取本地图片 - 漫画UUID:', mangaUuid, '分组:', groupPathWord, '章节UUID:', chapterUuid)

            const result = await invoke('get_local_chapter_images', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })

            console.log('后端返回的本地图片结果:', result)
            console.log('图片路径列表:', result.images)

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
        console.log('原始路径:', filePath)
        const result = safeConvertFileSrc(filePath)
        console.log('转换后URL:', result)
        return result
    }

    /**
     * 删除已下载的章节
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */
    async deleteChapter(mangaUuid, groupPathWord, chapterUuid) {
        try {
            await invoke('delete_chapter', {
                mangaUuid,
                groupPathWord,
                chapterUuid
            })
            return true
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
