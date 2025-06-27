import request from '../utils/request'
import { cartoonDownloadManager } from '../utils/cartoon-download-manager'

/**
 * 获取动画首页数据
 * @param {number} limit - 页大小
 * @param {number} offset - 页码-1
 * @param {string} ordering - 排序方式 -datetime_updated 最新更新 -popular 热度
 * @param {string} theme - 主题
 * @return {Promise} - 返回动画首页数据 /data/cartoon/动画首页.json
 */
function getCartoonHome(limit = 18, offset = 0, ordering = '-datetime_updated', theme = '') {
  return request.get('/api/v3/cartoons', {
    params: {
      free_type: 0,
      limit,
      offset,
      ordering,
      theme,
      platform: 3,
    },
  })
}

/**
 * 获取动画详情
 * @param {string} path_word - 动画拼音
 * @return {Promise} - 返回动画详情  /data/cartoon/动画详情.json
 */
function getCartoonInfo(path_word) {
  return request.get(`/api/v3/cartoon/${path_word}`, {
    params: {
      in_mainland: true,
      platform: 3,
    },
  })
}

/**
 * 获取动画章节列表
 * @param {string} path_word - 动画拼音
 * @returns {Promise} - 返回动画章节列表 /data/cartoon/动画章节列表.json
 */
function getCartoonChapters(path_word) {
  return request.get(`/api/v3/cartoon/${path_word}/chapters`, {
    params: {
      platform: 3,
    },
  })
}

/**
 * 获取视频
 * @param {*} path_word 动画拼音
 * @param {*} chapter_id 动画id
 * @param {*} line 线路
 * @returns {Promise} - 返回视频数据 /data/cartoon/动画视频.json
 */
function getVideoByChapterId(path_word, chapter_id, line) {
  return request.get(`/api/v3/cartoon/${path_word}/chapter/${chapter_id}`, {
    params: {
      line,
      platform: 3,
    },
  })
}

/**
 * 收藏或取消收藏动画
 * @param {*} cartoonId 动画uuid
 * @param {*} isCollect 是否收藏，默认true
 * @returns
 */
function collectCartoon(cartoonId, isCollect = true) {
  const data = new URLSearchParams()
  data.append('cartoon_id', cartoonId)
  data.append('is_collect', isCollect ? '1' : '0')
  return request.post('/api/v3/member/collect/cartoon', data, {
    headers: {
      platform: '3',
    },
  })
}

/**
 * 获取收藏的动画列表
 * @param {*} limit 页大小
 * @param {*} offset 页码-1
 * @param {*} free_type 免费类型
 * @param {*} ordering 排序方式 -datetime_updated: 最近更新 -datetime_modifier: 最近加入书架时间 -datetime_browse: 最近浏览时间
 * @returns
 */
function getCollectCartoonList(
  limit = 18,
  offset = 0,
  free_type = 1,
  ordering = '-datetime_modifier',
) {
  return request.get('/api/v3/member/collect/cartoons', {
    params: {
      limit,
      offset,
      free_type,
      ordering,
      platform: 3,
    },
    headers: {
      platform: '3',
    },
  })
}

/**
 * 获取动画专题
 * @param {*} type 专题类型，默认21
 * @param {*} limit 页大小，默认18
 * @param {*} offset 页码-1，默认0
 * @returns
 */
function getCartoonTopics(limit = 18, offset = 0, type = 21) {
  return request.get('/api/v3/topics', {
    params: {
      type,
      limit,
      offset,
      platform: 3,
    },
    headers: {
      platform: '3',
    },
  })
}

/**
 * 获取动画主题列表
 * @returns {Promise} - 返回动画主题列表
 */
function getCartoonThemes() {
  return request.get('/api/v3/theme/cartoon/count', {
    params: {
      limit: 500,
      offset: 0,
      free_type: 1,
      platform: 3,
    },
  })
}

/**
 * 动画搜索
 * @param {*} q 搜索关键词
 * @param {*} limit 页大小
 * @param {*} offset 页码-1
 * @returns
 */
function searchCartoon(q, limit = 18, offset = 0) {
  return request.get('/api/v3/search/cartoons', {
    params: {
      q,
      limit,
      offset,
      q_type: '',
      platform: 3,
    },
    headers: {
      platform: '3',
    },
  })
}

/**
 * 下载动画章节
 * @param {string} pathWord 动画路径标识
 * @param {string} chapterId 章节ID
 * @param {string} line 视频线路
 * @param {Object} chapterInfo 章节基本信息，包含cartoonDetail
 * @returns {Promise}
 */
async function downloadCartoonChapter(pathWord, chapterId, line, chapterInfo) {
  return getVideoByChapterId(pathWord, chapterId, line)
    .then((response) => {
      if (response && response.code === 200 && response.results) {
        const chapterData = response.results.chapter
        const cartoonData = response.results.cartoon

        // 构建下载信息
        const downloadInfo = {
          cartoonUuid: cartoonData.uuid,
          cartoonName: cartoonData.name,
          chapterUuid: chapterData.uuid,
          chapterName: chapterData.name,
          videoUrl: chapterData.video,
          // 优先使用动画主封面，如果没有再使用章节封面
          cover:
            chapterInfo.cartoonDetail && chapterInfo.cartoonDetail.cover
              ? chapterInfo.cartoonDetail.cover
              : chapterData.v_cover || cartoonData.cover || '/logo.png',
          videoFile: `${chapterData.name}.mp4`, // 添加视频文件名
          fileSize: chapterData.filesize || 0, // 添加文件大小
          startTime: new Date().toISOString(), // 添加开始时间
          // 使用传递的动画详情，如果没有则使用API返回的基本信息
          cartoonDetail: chapterInfo.cartoonDetail || {
            uuid: cartoonData.uuid,
            name: cartoonData.name,
            path_word: cartoonData.path_word,
            cover: cartoonData.cover || '',
            author: null,
            theme: [],
            status: null,
            popular: null,
            brief: null,
            datetime_updated: null,
          },
        }

        // 将任务添加到下载管理器
        return cartoonDownloadManager.addDownloadTask(downloadInfo)
      } else {
        throw new Error('获取视频数据失败：服务器返回错误响应')
      }
    })
    .catch((error) => {
      console.error('添加下载任务失败:', error)
      throw error
    })
}

/**
 * 删除已下载的动画章节
 * @param {string} cartoonUuid 动画UUID
 * @param {string} chapterUuid 章节UUID
 * @returns {Promise<boolean>}
 */
async function deleteCartoonChapter(cartoonUuid, chapterUuid) {
  return await cartoonDownloadManager.deleteChapter(cartoonUuid, chapterUuid)
}

/**
 * 删除整个本地动画（包括所有章节和详情）
 * @param {string} cartoonUuid 动画UUID
 * @returns {Promise<boolean>}
 */
async function deleteLocalCartoon(cartoonUuid) {
  return await cartoonDownloadManager.deleteLocalCartoon(cartoonUuid)
}

/**
 * 获取本地动画详情
 * @param {string} cartoonUuid 动画UUID
 * @returns {Promise<Object>}
 */
async function getLocalCartoonDetail(cartoonUuid) {
  return await cartoonDownloadManager.getLocalCartoonDetail(cartoonUuid)
}

/**
 * 获取本地动画章节列表
 * @param {string} cartoonUuid 动画UUID
 * @returns {Promise<Array>}
 */
async function getLocalCartoonChapters(cartoonUuid) {
  return await cartoonDownloadManager.getLocalCartoonChapters(cartoonUuid)
}

/**
 * 打开本地视频目录
 * @param {string} cartoonUuid 动画UUID
 * @param {string} chapterUuid 章节UUID
 */
async function openLocalVideoDirectory(cartoonUuid, chapterUuid) {
  return await cartoonDownloadManager.openLocalVideoDirectory(cartoonUuid, chapterUuid)
}

/**
 * 获取已下载的动画列表
 * @returns {Promise<Array>}
 */
async function getDownloadedCartoonList() {
  return await cartoonDownloadManager.getDownloadedCartoonList()
}

export {
  getCartoonHome,
  getCartoonInfo,
  getCartoonChapters,
  getVideoByChapterId,
  collectCartoon,
  getCollectCartoonList,
  getCartoonTopics,
  getCartoonThemes,
  searchCartoon,
  downloadCartoonChapter,
  deleteCartoonChapter,
  deleteLocalCartoon,
  getLocalCartoonDetail,
  getLocalCartoonChapters,
  openLocalVideoDirectory,
  getDownloadedCartoonList,
}
