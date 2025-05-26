import { defineStore } from 'pinia'
import { getUserInfo as fetchUserInfo } from '../api/user'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: '',
        token: '',
        password: '',
        isLoggedIn: false,
        userInfo: {
            username: '',
            email: '',
            avatar: '',
            description: '',
            createdAt: '',
            lastLoginAt: '',
            stats: {
                totalRead: 0,
                totalChapters: 0,
                totalTime: 0,
                favorites: 0
            }
        }
    }), actions: {
        setUser(userData) {
            this.username = userData.username
            this.token = userData.token
            this.isLoggedIn = true

            // 合并用户信息，设置默认值
            this.userInfo = {
                username: userData.username,
                email: userData.email || '',
                avatar: userData.avatar || '',
                description: userData.description || '这个用户很懒，什么都没有写...',
                createdAt: userData.createdAt || new Date().toISOString(),
                lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
                stats: {
                    totalRead: userData.stats?.totalRead || 0,
                    totalChapters: userData.stats?.totalChapters || 0,
                    totalTime: userData.stats?.totalTime || 0,
                    favorites: userData.stats?.favorites || 0
                }
            }

            if (userData.password) {
                this.password = userData.password
            }
        },

        setToken(token) {
            if (token) {
                this.token = token
                this.isLoggedIn = true
            }
        },

        logout() {
            this.token = ''
            this.isLoggedIn = false
            this.userInfo = {
                username: '',
                email: '',
                avatar: '',
                description: '',
                createdAt: '',
                lastLoginAt: '',
                stats: {
                    totalRead: 0,
                    totalChapters: 0,
                    totalTime: 0,
                    favorites: 0
                }
            }
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
                            favorites: 0 // API中似乎没有此数据
                        }
                    }
                    return this.userInfo;
                }
            } catch (error) {
                console.error('获取用户信息失败', error);
                throw error;
            }
        }
    },

    persist: {
        enabled: true,
        strategies: [
            {
                key: 'copymanga-user',
                storage: localStorage
            }
        ]
    }
}) 