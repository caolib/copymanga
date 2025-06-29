import request from '../utils/request'
import { fetch } from '@tauri-apps/plugin-http'

/**
 * 获取轻小说主页数据
 * @param {Object} params 请求参数
 * @param {String} params.ordering 排序方式 -popular: 人气排序 -datetime_updated: 更新时间排序
 * @param {Number} params.limit 每页数量
 * @param {Number} params.offset 偏移量
 * @param {String} params.theme 主题分类
 * @returns {Promise}
 */
function getBookHome(params = {}) {
  return request.get('/api/v3/books', {
    params: {
      limit: 18,
      offset: 0,
      ordering: '-popular',
      platform: 3,
      ...params,
    },
  })
}

/**
 * 获取个人收藏轻小说列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
function getMyBookCollection(params = {}) {
  return request.get('/api/v3/member/collect/books', {
    params: {
      limit: 18,
      offset: 0,
      free_type: 1,
      ordering: '-datetime_modifier',
      platform: 3,
      ...params,
    },
  })
}

/**
 * 获取轻小说详情
 * @param {string} pathWord 轻小说路径标识
 * @returns {Promise}
 */
function getBookDetail(pathWord) {
  return request.get(`/api/v3/book/${pathWord}`, {
    params: { platform: 3 },
  })
}

/**
 * 获取轻小说卷列表
 * @param {string} pathWord 轻小说路径标识
 * @returns {Promise} 轻小说卷数据
 */
function getBookVolumes(pathWord) {
  return request.get(`/api/v3/book/${pathWord}/volumes`, {
    params: { platform: 3 },
  })
}

/**
 * 获取轻小说指定卷的详情（包含txt地址和插画信息）
 * @param {string} pathWord 轻小说路径标识
 * @param {string} volumeId 卷ID
 * @returns {Promise} 该卷的详情数据（包含contents、txt_addr等）
 */
function getVolumeDetail(pathWord, volumeId) {
  return request.get(`/api/v3/book/${pathWord}/volume/${volumeId}`, {
    params: { platform: 3 },
  })
}

/**
 * 获取轻小说文本内容
 * @param {string} txtUrl 文本文件URL
 * @returns {Promise} 文本内容
 */
async function getBookTextContent(txtUrl) {
  try {
    console.log('使用Tauri HTTP插件直接请求文本内容:', txtUrl)
    const response = await fetch(txtUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, */*'
      },
      unsafeSend: true
    })

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`)
    }

    const text = await response.text()
    return { data: text }
  } catch (error) {
    console.error('Tauri HTTP请求文本内容失败:', error)
    throw error
  }
}

/**
 * 获取轻小说章节内容
 * @param {string} pathWord 轻小说路径标识
 * @param {string} chapterId 章节ID
 * @returns {Promise} 章节内容数据
 */
function getBookChapterContent(pathWord, chapterId) {
  return request.get(`/api/v3/book/${pathWord}/chapter/${chapterId}`, {
    params: { platform: 3 },
  })
}

/**
 * 搜索轻小说
 * @param {string} keyword 关键词
 * @param {number} limit 每页数量
 * @param {number} offset 偏移量
 * @param {string} q_type 搜索类型 '' - 全部, 'name' - 名称, 'author' - 作者
 * @returns {Promise} 搜索结果
 */
function searchBooks(keyword, limit = 18, offset = 0, q_type = '') {
  return request.get('/api/v3/search/books', {
    params: {
      q: keyword,
      q_type,
      offset,
      platform: 3,
      limit,
    },
    headers: {
      platform: '3',
    },
  })
}

/**
 * 收藏或取消收藏轻小说
 * @param {string} bookId 轻小说ID
 * @param {boolean} isCollect 是否收藏
 * @returns {Promise}
 */
function collectBook(bookId, isCollect = true) {
  const data = new URLSearchParams()
  data.append('book_id', bookId)
  data.append('is_collect', isCollect ? '1' : '0')
  data.append('platform', '3')
  return request.post('/api/v3/member/collect/book', data)
}

/**
 * 获取书籍主题标签
 * @returns {Promise}
 */
function getBookThemes() {
  return request.get('/api/v3/h5/filter/book/tags', {
    params: { platform: 3 },
  })
}

export {
  getBookHome,
  getMyBookCollection,
  getBookDetail,
  getBookVolumes,
  getVolumeDetail,
  getBookTextContent,
  searchBooks,
  collectBook,
  getBookThemes,
  getBookChapterContent
}
