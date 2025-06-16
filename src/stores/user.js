import { defineStore } from 'pinia'
import { getUserInfo as fetchUserInfo } from '../api/user'

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
            post_vip_end: null
        },
        // 多账号存储 - 保存完整的用户信息
        savedAccounts: [], // [{username, password, userInfo, lastLoginTime}]
        autoLogin: false
    }), actions: {
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
                post_vip_end: userData.post_vip_end || null
            }

            // 保存账号到多账号列表（保存完整用户信息包括token）
            this.saveAccount(userData.username, userData.password || '', userData.token, this.userInfo)
        },

        // 保存账号信息（包含token和完整用户信息）
        saveAccount(username, password, token, userInfo = null) {
            // 查找是否已存在该账号
            const existingIndex = this.savedAccounts.findIndex(account => account.username === username)

            const accountData = {
                username,
                password,
                token,
                userInfo: userInfo || { ...this.userInfo },
                lastLoginTime: new Date().toISOString()
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
            this.savedAccounts = this.savedAccounts.filter(account => account.username !== username)
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
            const account = this.savedAccounts.find(acc => acc.username === username)
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

        setToken(token) {
            if (token) {
                this.token = token
                this.isLoggedIn = true
            }
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
                post_vip_end: null
            }
            // 注意：不清除savedAccounts，保留多账号信息
        },

        // 从API获取最新的用户信息
        async fetchUserInfo() {
            if (!this.token || !this.isLoggedIn) {
                return;
            }

            try {
                const response = await fetchUserInfo();
                if (response.code === 200 && response.results) {
                    const userInfoData = response.results;

                    // 更新用户信息
                    this.userInfo = {
                        username: userInfoData.username || this.username,
                        nickname: userInfoData.nickname || '',
                        avatar: userInfoData.avatar || '',
                        description: userInfoData.description || '这个用户很懒，什么都没有写...',
                        createdAt: userInfoData.datetime_created || this.userInfo.createdAt,
                        lastLoginAt: new Date().toISOString(),
                        userId: userInfoData.user_id || '',
                        stats: {
                            totalRead: userInfoData.downloads || 0,
                            totalChapters: userInfoData.day_downloads || 0,
                            vipDownloads: userInfoData.vip_downloads || 0,
                            rewardDownloads: userInfoData.reward_downloads || 0,
                            ticket: userInfoData.ticket || 0,
                            rewardTicket: userInfoData.reward_ticket || 0,
                            favorites: 0
                        }
                    }
                    return this.userInfo;
                }
            } catch (error) {
                console.error('获取用户信息失败', error);
                throw error;
            }
        },

        // 更新本地用户信息
        updateUserInfo(updates) {
            this.userInfo = {
                ...this.userInfo,
                ...updates
            }
        }
    },

    persist: {
        key: 'copymanga-user',
        storage: localStorage,
        paths: ['username', 'token', 'isLoggedIn', 'userInfo', 'savedAccounts', 'autoLogin']
    }
})