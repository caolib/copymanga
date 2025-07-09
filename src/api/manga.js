import request from '../utils/request'
import { downloadManager } from '../utils/manga-downloader'
import { useUserStore } from '../stores/user'

/**
 * 获取请求ID的通用函数（每次都重新获取）
 * @returns {Promise<string>} 请求ID
 */
async function getRequestIdForAPI() {
    const userId = useUserStore().userInfo?.user_id

    const requestIdResponse = await getRequestId(userId)
    const request_id = requestIdResponse.results?.request_id

    console.log('获取请求ID:', request_id)

    return request_id
}

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
 * 获取漫画章节列表 新API @see getMangaGroupChapters
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise} 漫画章节数据
 */
function getMangaChapters(pathWord) {
    return request.get(`/comicdetail/${pathWord}/chapters`,
        {
            params: {
                platform: 3,
                in_mainland: true,
                request_id: 'bwygrcje81'
            }
        }
    )
}



// ------------------------------------------------------------

/**
 * 获取漫画分组章节列表（新API）旧的 @see getMangaChapters
 * @param {string} pathWord 漫画路径标识
 * @param {string} groupPathWord 分组路径，默认为default
 * @param {number} limit 每页数量，默认100
 * @param {number} offset 偏移量，默认0
 * @returns {Promise} 漫画章节数据
 */
async function getMangaGroupChapters(pathWord, groupPathWord = 'default', limit = 100, offset = 0, request_id = '') {
    return request.get(`/api/v3/comic/${pathWord}/group/${groupPathWord}/chapters`, {
        params: {
            limit,
            offset,
            platform: 3,
            in_mainland: true,
            request_id
        }
    });
}


/**
 * 获取漫画详情
 * @param {string} pathWord 漫画路径标识
 * @returns {Promise}
 */
async function getMangaDetail(pathWord, request_id = '') {
    return request.get(`/api/v3/comic2/${pathWord}`, {
        params: { platform: 3, in_mainland: true, request_id }
    });
}

// ------------------------------------------------------------

/**
 * 获取最新上架漫画
 * @param {string} date 日期，格式为YYYY-MM-DD，默认为当前日期
 * @param {number} limit 每页数量，默认18
 * @param {number} offset 偏移量，默认0
 * @returns {Promise} 最新漫画数据
 */
function getNewestManga(date = '', limit = 18, offset = 0) {
    return request.get('/api/v3/update/newest', {
        params: {
            date,
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
    const data = new URLSearchParams({
        comic_id: comicId,
        is_collect: isCollect ? '1' : '0'
    });

    return request.post('/api/v3/member/collect/comic', data, {
        headers: {
            platform: '3',
        }
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
 * @param {Object} chapterInfo 章节基本信息，包含mangaDetail
 * @param {Function} onProgress 进度回调
 * @returns {Promise}
 */
async function downloadChapter(pathWord, chapterId, chapterInfo, onProgress) {
    return getChapterImages(pathWord, chapterId).then(response => {
        if (response && response.code === 200 && response.results) {
            const chapterData = response.results.chapter
            const comicData = response.results.comic

            // 构建下载信息，优先使用传递的漫画详情
            const downloadInfo = {
                mangaUuid: comicData.uuid,
                mangaName: comicData.name,
                groupPathWord: chapterInfo.group_path_word || 'default',
                chapterUuid: chapterData.uuid,
                chapterName: chapterData.name,
                totalImages: chapterData.size || chapterData.contents.length, // 添加总图片数量
                images: chapterData.contents.map((image, index) => ({
                    url: image.url,
                    index: index,
                    width: image.width || null,
                    height: image.height || null
                })),
                // 使用传递的漫画详情，如果没有则使用API返回的基本信息
                mangaDetail: chapterInfo.mangaDetail || {
                    uuid: comicData.uuid,
                    name: comicData.name,
                    cover: '',
                    author: [],
                    theme: [],
                    status: null,
                    popular: null,
                    brief: null,
                    datetime_updated: null
                }
            }

            // 开始下载
            return downloadManager.downloadChapter(downloadInfo, onProgress)
        } else {
            throw new Error('获取章节数据失败：服务器返回错误响应')
        }
    }).catch(error => {
        console.error('下载章节失败:', error)
    })
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

/**
 * 获取已下载的漫画列表
 * @returns {Promise<Array>}
 */
async function getDownloadedMangaList() {
    return await downloadManager.getDownloadedMangaList()
}

/**
 * 获取本地漫画详情
 * @param {string} mangaUuid 漫画UUID
 * @returns {Promise<Object|null>}
 */
async function getLocalMangaDetail(mangaUuid) {
    return await downloadManager.getLocalMangaDetail(mangaUuid)
}

/**
 * 获取本地漫画的章节列表
 * @param {string} mangaUuid 漫画UUID
 * @returns {Promise<Array>}
 */
async function getLocalMangaChapters(mangaUuid) {
    return await downloadManager.getLocalMangaChapters(mangaUuid)
}

/**
 * 删除整个本地漫画（包括所有章节和详情）
 * @param {string} mangaUuid 漫画UUID
 * @returns {Promise<boolean>}
 */
async function deleteLocalManga(mangaUuid) {
    return await downloadManager.deleteLocalManga(mangaUuid)
}

/**
 * 检查章节下载的详细状态
 * @param {string} mangaUuid 漫画UUID
 * @param {string} chapterUuid 章节UUID
 * @param {string} groupPathWord 分组路径，默认为default
 * @returns {Promise<Object>} 章节下载详细状态
 */
async function checkChapterDownloadDetail(mangaUuid, chapterUuid, groupPathWord = 'default') {
    return await downloadManager.checkChapterDownloadDetail(mangaUuid, chapterUuid, groupPathWord)
}

/**
 * 获取漫画发现列表
 * @param {Object} params 请求参数
 * @param {String} params.ordering 排序方式 -popular: 人气排序 -datetime_updated: 更新时间排序
 * @param {Number} params.limit 每页数量
 * @param {Number} params.offset 偏移量
 * @param {String} params.theme 主题分类
 * @param {String} params.top 地区分类
 * @returns {Promise}
 */
function getMangaDiscover(params = {}) {
    return request.get('/api/v3/comics', {
        params: {
            limit: 18,
            offset: 0,
            ordering: '-popular',
            platform: 3,
            ...params
        }
    })
}

/**
 * 获取漫画过滤标签（主题、排序方式、地区）
 * @returns {Promise}
 */
function getMangaFilterTags() {
    // 由于没有专门的漫画标签接口，我们借用书籍标签接口，结构应该是类似的
    return request.get('/api/v3/h5/filter/book/tags', {
        params: { platform: 3 }
    })
}

/**
 * 获取漫画排行榜
 * @param {number} type 类型：1(漫画), 5(轻小说)
 * @param {string} dateType 时间类型：'day'(日榜), 'week'(周榜), 'month'(月榜), 'total'(总榜)
 * @param {string} audienceType 受众类型：''(全部), 'male'(男频), 'female'(女频)
 * @param {number} limit 每页数量，默认18
 * @param {number} offset 偏移量，默认0
 * @returns {Promise} 排行榜数据
 */
function getMangaRanking(type = 1, dateType = 'week', audienceType = '', limit = 18, offset = 0) {
    return request.get('/api/v3/ranks', {
        params: {
            type,
            date_type: dateType,
            audience_type: audienceType,
            limit,
            offset,
            platform: 3
        }
    });
}

/**
 * 获取请求ID（使用不同的baseURL）
 * @param {string} userId 用户ID，从用户信息中获取
 * @returns {Promise} 请求ID响应，包含request_id和广告列表
 */
function getRequestId(userId) {
    // 直接使用完整URL，避免baseURL被篡改
    const fullUrl = 'https://marketing.aiacgn.com/api/v2/adopr/query2/'

    return request.get(fullUrl, {
        params: {
            ident: '200100004',
            channels: '2001,2007,2004,2005',
            user_id: userId,
            in_mainland: 'true',
            platform: '3'
        }
    })
}

export {
    getMyCollectionRaw,
    getMangaChapters,
    getMangaGroupChapters,
    getNewestManga,
    getChapterImages,
    searchManga,
    collectManga,
    getMangaDetail,
    getHomeIndex,
    getAuthorMangaList,
    downloadChapter,
    getDownloadedChapterInfo,
    getDownloadedMangaList,
    getLocalMangaDetail,
    getLocalMangaChapters,
    deleteLocalManga,
    checkChapterDownloadDetail,
    getMangaDiscover,
    getMangaFilterTags,
    getMangaRanking,
    getRequestIdForAPI
}
