import { defineStore } from 'pinia'
import {
  getUserInfo as fetchUserInfo,
  getBrowseComics,
  getBrowseBooks,
  getBrowsePosts,
  getBrowseCartoons,
} from '../api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    username: '',
    token: '',
    isLoggedIn: false,
    userInfo: {
      user_id: '',
      username: '',
      nickname: '',
      avatar: '',
      datetime_created: '',
      ticket: 0,
      reward_ticket: 0,
      downloads: 0,
      vip_downloads: 0,
      reward_downloads: 0,
      ads_vip_end: null,
      post_vip_end: null,
      invite_code: null,
      invited: null,
      scy_answer: false,
      day_downloads_refresh: '',
      day_downloads: 0,
    },
    // 浏览记录相关
    browseHistory: {
      comics: { list: [], total: 0, loading: false, hasMore: true },
      books: { list: [], total: 0, loading: false, hasMore: true },
      posts: { list: [], total: 0, loading: false, hasMore: true },
      cartoons: { list: [], total: 0, loading: false, hasMore: true },
    },
    // 多账号存储 - 保存完整的用户信息
    savedAccounts: [],
    autoLogin: false,
  }),
  actions: {
    setUser(userData) {
      this.username = userData.username
      this.token = userData.token
      this.isLoggedIn = true

      // 根据API实际返回的字段设置用户信息
      this.userInfo = {
        user_id: userData.user_id || '',
        username: userData.username,
        nickname: userData.nickname || '',
        avatar: userData.avatar || '',
        datetime_created: userData.datetime_created || '',
        ticket: userData.ticket || 0,
        reward_ticket: userData.reward_ticket || 0,
        downloads: userData.downloads || 0,
        vip_downloads: userData.vip_downloads || 0,
        reward_downloads: userData.reward_downloads || 0,
        ads_vip_end: userData.ads_vip_end || null,
        post_vip_end: userData.post_vip_end || null,
        invite_code: userData.invite_code || null,
        invited: userData.invited || null,
        scy_answer: userData.scy_answer || false,
        day_downloads_refresh: userData.day_downloads_refresh || '',
        day_downloads: userData.day_downloads || 0,
      }

      // 保存账号到多账号列表（保存完整用户信息包括token）
      this.saveAccount(userData.username, userData.password || '', userData.token, this.userInfo)
    },

    // 保存账号信息（包含token和完整用户信息）
    saveAccount(username, password, token, userInfo = null) {
      // 查找是否已存在该账号
      const existingIndex = this.savedAccounts.findIndex((account) => account.username === username)

      const accountData = {
        username,
        password,
        token,
        userInfo: userInfo || { ...this.userInfo },
        lastLoginTime: new Date().toISOString(),
      }

      if (existingIndex >= 0) {
        // 更新现有账号
        this.savedAccounts[existingIndex] = accountData
      } else {
        // 添加新账号
        this.savedAccounts.push(accountData)
      }

      // 按最后登录时间排序（最新的在前）
      this.savedAccounts.sort((a, b) => new Date(b.lastLoginTime) - new Date(a.lastLoginTime))
    },

    // 删除保存的账号
    removeSavedAccount(username) {
      this.savedAccounts = this.savedAccounts.filter((account) => account.username !== username)
    },

    // 设置自动登录
    setAutoLogin(enabled) {
      this.autoLogin = enabled
    },

    // 获取最近登录的账号
    getRecentAccount() {
      return this.savedAccounts.length > 0 ? this.savedAccounts[0] : null
    },

    // 快速切换到指定账号
    switchToAccount(username) {
      const account = this.savedAccounts.find((acc) => acc.username === username)
      if (account && account.userInfo && account.token) {
        // 更新当前用户信息和token
        this.username = account.username
        this.token = account.token // 切换token是关键！
        this.userInfo = { ...account.userInfo }
        this.isLoggedIn = true

        // 更新该账号的最后登录时间
        account.lastLoginTime = new Date().toISOString()

        // 重新排序账号列表
        this.savedAccounts.sort((a, b) => new Date(b.lastLoginTime) - new Date(a.lastLoginTime))

        return account
      }
      return null
    },

    logout() {
      this.username = ''
      this.token = ''
      this.isLoggedIn = false
      this.autoLogin = false // 退出登录时禁用自动登录
      this.userInfo = {
        user_id: '',
        username: '',
        nickname: '',
        avatar: '',
        datetime_created: '',
        ticket: 0,
        reward_ticket: 0,
        downloads: 0,
        vip_downloads: 0,
        reward_downloads: 0,
        ads_vip_end: null,
        post_vip_end: null,
        invite_code: null,
        invited: null,
        scy_answer: false,
        day_downloads_refresh: '',
        day_downloads: 0,
      }
      // 注意：不清除savedAccounts，保留多账号信息
    },

    // 从API获取最新的用户信息
    async fetchUserInfo() {
      if (!this.token || !this.isLoggedIn) {
        return
      }

      try {
        const response = await fetchUserInfo()
        if (response.code === 200 && response.results) {
          const userInfoData = response.results

          // 更新用户信息，保持API字段名
          this.userInfo = {
            user_id: userInfoData.user_id || '',
            username: userInfoData.username || this.username,
            nickname: userInfoData.nickname || '',
            avatar: userInfoData.avatar || '',
            datetime_created: userInfoData.datetime_created || '',
            ticket: userInfoData.ticket || 0,
            reward_ticket: userInfoData.reward_ticket || 0,
            downloads: userInfoData.downloads || 0,
            vip_downloads: userInfoData.vip_downloads || 0,
            reward_downloads: userInfoData.reward_downloads || 0,
            ads_vip_end: userInfoData.ads_vip_end || null,
            post_vip_end: userInfoData.post_vip_end || null,
            invite_code: userInfoData.invite_code || null,
            invited: userInfoData.invited || null,
            scy_answer: userInfoData.scy_answer || false,
            day_downloads_refresh: userInfoData.day_downloads_refresh || '',
            day_downloads: userInfoData.day_downloads || 0,
          }
          return this.userInfo
        }
      } catch (error) {
        console.error('获取用户信息失败', error)
        throw error
      }
    },

    // 更新本地用户信息
    // 获取浏览记录
    async fetchBrowseHistory(type = 'comics', offset = 0, limit = 18, reset = false) {
      if (!this.isLoggedIn) return

      this.browseHistory[type].loading = true

      try {
        let response
        switch (type) {
          case 'comics':
            response = await getBrowseComics(offset, limit)
            break
          case 'books':
            response = await getBrowseBooks(offset, limit)
            break
          case 'posts':
            response = await getBrowsePosts(offset, limit)
            break
          case 'cartoons':
            response = await getBrowseCartoons(offset, limit)
            break
          default:
            throw new Error('无效的浏览记录类型')
        }

        if (response.code === 200 && response.results) {
          const { list, total } = response.results

          if (reset) {
            this.browseHistory[type].list = list
          } else {
            this.browseHistory[type].list.push(...list)
          }

          this.browseHistory[type].total = total
          this.browseHistory[type].hasMore = this.browseHistory[type].list.length < total
        }
      } catch (error) {
        console.error(`获取${type}浏览记录失败:`, error)
        throw error
      } finally {
        this.browseHistory[type].loading = false
      }
    },

    // 重置浏览记录状态
    resetBrowseHistory(type = null) {
      if (type) {
        this.browseHistory[type] = {
          list: [],
          total: 0,
          loading: false,
          hasMore: true,
        }
      } else {
        // 重置所有类型
        this.browseHistory = {
          comics: { list: [], total: 0, loading: false, hasMore: true },
          books: { list: [], total: 0, loading: false, hasMore: true },
          posts: { list: [], total: 0, loading: false, hasMore: true },
          cartoons: { list: [], total: 0, loading: false, hasMore: true },
        }
      }
    },
  },

  persist: {
    key: 'copymanga-user',
    storage: localStorage,
    paths: ['username', 'token', 'isLoggedIn', 'userInfo', 'savedAccounts', 'autoLogin'],
  },
})
