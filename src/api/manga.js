import request from '../utils/request'
import { downloadManager } from '../utils/download-manager'

/**
 * 查询个人书架
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
function getMyCollectionRaw(params = {}) {
    return request.get('/api/v3/member/collect/comics', {
        params: {
            limit: 12,
            offset: 0,
            free_type: 1,
            ordering: '-datetime_updated',
            ...params
        }
    })
}

/**
 * 获取漫画章节列表
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise} 漫画章节数据
 */
function getMangaChapters(pathWord) {
    return request.get(`/comicdetail/${pathWord}/chapters`)
}

/**
 * 获取漫画分组章节列表（新API）
 * @param {string} pathWord 漫画路径标识
 * @param {string} groupPathWord 分组路径，默认为default
 * @param {number} limit 每页数量，默认100
 * @param {number} offset 偏移量，默认0
 * @returns {Promise} 漫画章节数据
 */
function getMangaGroupChapters(pathWord, groupPathWord = 'default', limit = 100, offset = 0) {
    return request.get(`/api/v3/comic/${pathWord}/group/${groupPathWord}/chapters`, {
        params: {
            limit,
            offset,
            platform: 3
        }
    });
}

/**
 * 获取漫画章节图片
 * @param {string} pathWord 漫画路径标识
 * @param {string} chapterId 章节ID
 * @returns {Promise} 章节图片数据
 */
function getChapterImages(pathWord, chapterId) {
    return request.get(`/api/v3/comic/${pathWord}/chapter/${chapterId}`)
}

/**
 * 搜索漫画
 * @param {*} q 搜索关键词
 * @param {*} limit 每页数量
 * @param {*} offset 偏移量
 * @param {*} q_type 搜索类型 '' - 全部, 'name' - 名称, 'author' - 作者, 'local' - 汉化组
 * @returns 
 */
function searchManga(q, limit = 18, offset = 0, q_type = '') {
    return request.get('/api/v3/search/comic', {
        params: {
            limit,
            offset,
            q_type,
            q,
            platform: 3
        },
        headers: {
            'platform': '3'
        }
    });
}

/**
 * 收藏或取消收藏漫画
 * @param {string} comicId 漫画ID
 * @param {boolean} isCollect 是否收藏
 * @returns {Promise}
 */
function collectManga(comicId, isCollect = true) {
    const data = new URLSearchParams();
    data.append('comic_id', comicId);
    data.append('is_collect', isCollect ? '1' : '0');
    return request.post('/api/v2/web/collect', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        }
    });
}

/**
 * 获取漫画详情
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise}
 */
function getMangaDetail(pathWord) {
    return request.get(`/api/v3/comic2/${pathWord}`, {
        params: { platform: 3 }
    });
}

/**
 * 获取主页漫画信息
 * @returns {Promise} 主页漫画数据，包含话题、推荐漫画、排行榜等
 */
function getHomeIndex() {
    return request.get('/api/v3/h5/homeIndex', {
        params: { platform: 3 }
    });
}

/**
 * 获取作者的漫画列表   
 * @param {string} author 作者名字的path_word(拼音)
 * @param {*} limit 每页数量，默认21
 * @param {*} offset 偏移量，默认0
 * @param {*} ordering 排序方式，默认'-datetime_updated'
 * @returns 
 */
function getAuthorMangaList(author, limit = 21, offset = 0, ordering = '-datetime_updated') {
    return request.get(`/api/v3/comics`, {
        params: {
            limit,
            offset,
            platform: 3,
            author,
            ordering
        }
    });
}

/**
 * 下载章节
 * @param {string} pathWord 漫画路径标识
 * @param {string} chapterId 章节ID
 * @param {Object} chapterInfo 章节基本信息
 * @param {Function} onProgress 进度回调
 * @returns {Promise}
 */
async function downloadChapter(pathWord, chapterId, chapterInfo, onProgress) {
    try {
        // 先获取章节图片数据
        const response = await getChapterImages(pathWord, chapterId)

        if (response && response.code === 200 && response.results) {
            const chapterData = response.results.chapter
            const comicData = response.results.comic

            // 构建下载信息
            const downloadInfo = {
                mangaUuid: comicData.uuid,
                mangaName: comicData.name,
                groupPathWord: chapterInfo.group_path_word || 'default',
                chapterUuid: chapterData.uuid,
                chapterName: chapterData.name,
                images: chapterData.contents.map((image, index) => ({
                    url: image.url,
                    index: index,
                    width: image.width || null,
                    height: image.height || null
                }))
            }

            // 开始下载
            return await downloadManager.downloadChapter(downloadInfo, onProgress)
        } else {
            throw new Error('获取章节数据失败：服务器返回错误响应')
        }
    } catch (error) {
        // 检查是否是网络错误
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
            throw new Error('网络连接失败，请检查代理服务器是否正常运行')
        } else if (error.response && error.response.status === 502) {
            throw new Error('代理服务器错误(502)，请稍后重试')
        } else if (error.message.includes('CORS')) {
            throw new Error('跨域请求失败，请检查代理服务器配置')
        }

        // 其他错误直接抛出
        throw error
    }
}

/**
 * 检查章节是否已下载
 * @param {string} mangaUuid 漫画UUID
 * @param {string} groupPathWord 分组路径
 * @param {string} chapterUuid 章节UUID
 * @returns {Promise<boolean>}
 */
async function isChapterDownloaded(mangaUuid, groupPathWord, chapterUuid) {
    return await downloadManager.isChapterDownloaded(mangaUuid, groupPathWord, chapterUuid)
}

/**
 * 获取已下载的章节信息
 * @param {string} mangaUuid 漫画UUID
 * @param {string} groupPathWord 分组路径
 * @param {string} chapterUuid 章节UUID
 * @returns {Promise<Object|null>}
 */
async function getDownloadedChapterInfo(mangaUuid, groupPathWord, chapterUuid) {
    return await downloadManager.getDownloadedChapterInfo(mangaUuid, groupPathWord, chapterUuid)
}

export {
    getMyCollectionRaw,
    getMangaChapters,
    getMangaGroupChapters,
    getChapterImages,
    searchManga,
    collectManga,
    getMangaDetail,
    getHomeIndex,
    getAuthorMangaList,
    downloadChapter,
    isChapterDownloaded,
    getDownloadedChapterInfo
}
