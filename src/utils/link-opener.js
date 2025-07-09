import { invoke } from '@tauri-apps/api/core'
import { message } from 'ant-design-vue'

/**
 * 使用系统默认浏览器打开外部链接
 * @param {string} url - 要打开的URL
 * @param {string} errorMsg - 失败时显示的错误消息
 */
const openExternalUrl = (url, errorMsg = '打开链接失败') => {
  invoke('open_browser', { url }).catch((error) => {
    console.error('打开链接失败:', error)
    message.error(errorMsg)
  })
}

/**
 * 全局外部链接配置
 */
const externalLinks = {
  // 关于页面相关链接
  authorGithub: {
    url: 'https://github.com/caolib',
    errorMsg: '打开作者GitHub页面失败',
  },
  iconAuthor: {
    url: 'https://www.pixiv.net/users/19962074',
    errorMsg: '打开图标作者页面失败',
  },
  iconSource: {
    url: 'https://www.pixiv.net/artworks/102695187',
    errorMsg: '打开图标来源页面失败',
  },
  repository: {
    url: 'https://github.com/caolib/doki',
    errorMsg: '打开项目仓库失败',
  },
  feedback: {
    url: 'https://github.com/caolib/doki/issues',
    errorMsg: '打开反馈页面失败',
  },
  downloadPage: {
    url: 'https://github.com/caolib/doki/releases',
    errorMsg: '打开下载页面失败',
  },
  // 其他相关链接
  copyManga: {
    url: 'https://www.copy20.com',
    errorMsg: '打开拷贝漫画官网失败',
  },
  // 可以在这里添加其他页面的链接配置
}

/**
 * 统一的外部链接打开方法
 * @param {string} linkKey - 链接标识符
 */
const openLink = (linkKey) => {
  const linkConfig = externalLinks[linkKey]
  if (!linkConfig) {
    console.error(`链接配置未找到: ${linkKey}`)
    // noinspection JSIgnoredPromiseFromCall
    message.error('链接配置错误')
    return
  }

  openExternalUrl(linkConfig.url, linkConfig.errorMsg)
}

export { openExternalUrl, openLink, externalLinks }
