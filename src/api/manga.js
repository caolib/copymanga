import request from '../utils/request'

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
 * @param {string} keyword 关键词
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @returns {Promise} 搜索结果
 */
function searchManga(keyword, limit = 12, offset = 0) {
    return request.get('/api/kb/web/searchbd/comics', {
        params: {
            q: keyword,
            q_type: '',
            offset,
            platform: 2,
            limit
        }
    })
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

export {
    getMyCollectionRaw,
    getMangaChapters,
    getMangaGroupChapters,
    getChapterImages,
    searchManga,
    collectManga,
    getMangaDetail,
    getHomeIndex,
    getAuthorMangaList
}
