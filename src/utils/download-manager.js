import { invoke } from '@tauri-apps/api/core'
import { message } from 'ant-design-vue'

/**
 * 下载管理器类 - 使用 Tauri 后端处理下载
 */
export class DownloadManager {
    constructor() {
        this.downloadQueue = []
        this.activeDownloads = new Map()
        this.progressCallbacks = new Map()    }

    /**
     * 下载章节 - 使用 Tauri 后端
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

        // 构建下载信息
        const downloadInfo = {
            manga_uuid: mangaUuid,
            manga_name: mangaName,
            group_path_word: groupPathWord,
            chapter_uuid: chapterUuid,
            chapter_name: chapterName,
            images: images.map((image, index) => ({
                url: image.url,
                index: index,
                filename: `${String(index + 1).padStart(3, '0')}.jpg`
            }))
        }

        // 保存进度回调
        const downloadId = `${mangaUuid}_${chapterUuid}`
        this.progressCallbacks.set(downloadId, onProgress)

        return invoke('download_chapter', { downloadInfo }).then(result => {
            // 清理回调
            this.progressCallbacks.delete(downloadId)
            
            return {
                success: true,
                chapterDir: result.chapter_path,
                totalImages: images.length,
                message: `章节 "${chapterName}" 下载完成`
            }
        }).catch(error => {
            console.error('下载章节失败:', error)
            this.progressCallbacks.delete(downloadId)
            throw new Error(`下载失败: ${error}`)
        })
    }

    /**
     * 处理下载进度更新 - 由 Tauri 后端调用
     */
    handleProgressUpdate(downloadId, progress) {
        const callback = this.progressCallbacks.get(downloadId)
        if (callback) {
            callback(progress)
        }
    }

    /**
     * 检查章节是否已下载
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */    async isChapterDownloaded(mangaUuid, groupPathWord, chapterUuid) {
        return invoke('check_chapter_downloaded', {
            mangaUuid,
            groupPathWord,
            chapterUuid
        }).then(result => {
            return result.is_downloaded
        }).catch(error => {
            console.error('检查下载状态失败:', error)
            return false
        })
    }

    /**
     * 获取已下载的章节信息
     * @param {string} mangaUuid 漫画UUID
     * @param {string} groupPathWord 分组路径
     * @param {string} chapterUuid 章节UUID
     */    async getDownloadedChapterInfo(mangaUuid, groupPathWord, chapterUuid) {
        return invoke('get_downloaded_chapter_info', {
            mangaUuid,
            groupPathWord,
            chapterUuid
        }).then(result => {
            return result.chapter_info
        }).catch(error => {
            console.error('获取下载信息失败:', error)
            return null
        })
    }
}

// 创建单例实例
export const downloadManager = new DownloadManager()
