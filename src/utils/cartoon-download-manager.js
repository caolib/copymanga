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
 * 动画下载管理器类 - 通过 Tauri 后端处理下载
 */
export class CartoonDownloadManager {
    constructor() {
        console.log('动画下载管理器初始化')
    }/**
     * 下载动画章节 - 通过 Tauri 后端处理
     * @param {Object} chapterInfo 章节信息
     * @param {Function} onProgress 进度回调
     */
    async downloadChapter(chapterInfo, onProgress) {
        const {
            cartoonUuid,
            cartoonName,
            chapterUuid,
            chapterName,
            videoUrl,
            cover,
            cartoonDetail // 动画详情参数
        } = chapterInfo

        console.log('开始下载动画章节:', chapterName, '视频URL:', videoUrl)

        let progressInterval = null

        try {
            // 开始进度回调
            if (onProgress) {
                onProgress({
                    completed: 0,
                    total: 100,
                    percent: 0,
                    currentFile: '准备下载...',
                    status: 'starting'
                })
            }

            // 检查是否是HLS流
            const isHLS = videoUrl.includes('.m3u8')            // 启动进度监控定时器
            if (onProgress) {
                progressInterval = setInterval(async () => {
                    try {
                        // 获取真实的下载进度
                        const progress = await this.getDownloadProgress(cartoonUuid, chapterUuid)

                        onProgress({
                            completed: progress.downloaded_size || 0,
                            total: progress.total_size || 1,
                            percent: progress.percent || 0,
                            currentFile: progress.percent < 80 ? '正在下载视频片段...' :
                                progress.percent < 100 ? '正在合并视频...' : '下载完成',
                            status: progress.completed ? 'completed' : 'downloading'
                        })

                        // 如果下载完成，停止监控
                        if (progress.completed) {
                            clearInterval(progressInterval)
                            progressInterval = null
                            onProgress({
                                completed: progress.total_size || 1,
                                total: progress.total_size || 1,
                                percent: 100,
                                currentFile: '下载完成',
                                status: 'completed'
                            })
                        }
                    } catch (error) {
                        console.error('检查下载进度失败:', error)
                    }
                }, 1000) // 每秒检查一次
            }

            // 调用 Rust 后端下载命令
            await invoke('download_cartoon_chapter', {
                cartoonUuid,
                cartoonName,
                chapterUuid,
                chapterName,
                videoUrl,
                cover: cover || '',
                cartoonDetail: cartoonDetail || null // 传递动画详情
            })

            // 清除定时器
            if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
            }

            // 最终完成进度回调
            if (onProgress) {
                onProgress({
                    completed: 100,
                    total: 100,
                    percent: 100,
                    currentFile: '下载完成',
                    status: 'completed'
                })
            }

            return {
                success: true,
                message: `动画章节 "${chapterName}" 下载完成`
            }
        } catch (error) {
            console.error('下载动画章节失败:', error)

            // 确保清除定时器
            if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
            }

            if (onProgress) {
                onProgress({
                    completed: 0,
                    total: 100,
                    percent: 0,
                    currentFile: '下载失败',
                    status: 'error',
                    error: error.message
                })
            }
            throw error
        }
    }    // 删除 isChapterDownloaded - 请使用 getLocalCartoonChapters 批量获取本地章节

    /**
     * 获取下载进度
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async getDownloadProgress(cartoonUuid, chapterUuid) {
        try {
            const result = await invoke('get_cartoon_download_progress', {
                cartoonUuid,
                chapterUuid
            })
            return result || { percent: 0, completed: false }
        } catch (error) {
            console.error('获取动画下载进度失败:', error)
            return { percent: 0, completed: false }
        }
    }

    /**
     * 删除已下载的动画章节
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async deleteChapter(cartoonUuid, chapterUuid) {
        try {
            const result = await invoke('delete_downloaded_cartoon_chapter', {
                cartoonUuid,
                chapterUuid
            })

            if (result.success) {
                console.log('动画章节删除成功:', result.message)
                return true
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('删除动画章节失败:', error)
            throw error
        }
    }

    /**
     * 获取已下载的动画列表
     * @returns {Promise<Array>}
     */
    async getDownloadedCartoonList() {
        try {
            const result = await invoke('get_downloaded_cartoon_list')

            // 处理返回的数据，转换封面图片路径为可访问的URL
            return result.map(cartoon => ({
                ...cartoon,
                coverUrl: cartoon.coverPath ? this.convertLocalFileToUrl(cartoon.coverPath) : null
            }))
        } catch (error) {
            console.error('获取已下载动画列表失败:', error)
            return []
        }
    }    /**
     * 转换本地文件路径为 Tauri 可访问的 URL
     * @param {string} filePath 本地文件路径
     * @returns {string} 转换后的 URL
     */
    convertLocalFileToUrl(filePath) {
        return safeConvertFileSrc(filePath)
    }

    /**
     * 获取本地动画详情
     * @param {string} cartoonUuid 动画UUID
     * @returns {Promise<Object>}
     */
    async getLocalCartoonDetail(cartoonUuid) {
        try {
            const result = await invoke('get_local_cartoon_detail', {
                cartoonUuid
            })

            // 处理封面图片路径
            if (result.coverPath) {
                result.coverUrl = this.convertLocalFileToUrl(result.coverPath)
            }

            return result
        } catch (error) {
            console.error('获取本地动画详情失败:', error)
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
            const result = await invoke('get_local_cartoon_chapters', {
                cartoonUuid
            })

            return result || []
        } catch (error) {
            console.error('获取本地动画章节列表失败:', error)
            return []
        }
    }

    /**
     * 打开本地视频文件所在目录
     * @param {string} cartoonUuid 动画UUID
     * @param {string} chapterUuid 章节UUID
     */
    async openLocalVideoDirectory(cartoonUuid, chapterUuid) {
        try {
            const result = await invoke('open_local_video_directory', {
                cartoonUuid,
                chapterUuid
            })

            if (result.success) {
                console.log('打开本地目录成功:', result.message)
                return true
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error('打开本地目录失败:', error)
            throw error
        }
    }
}

// 创建单例实例
export const cartoonDownloadManager = new CartoonDownloadManager()
