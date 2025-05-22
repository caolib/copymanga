import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: '',
        token: '',
        isLoggedIn: false,
        userInfo: null
    }), actions: {
        setUser(userData) {
            this.username = userData.username
            this.token = userData.token
            this.isLoggedIn = true
            this.userInfo = userData.userInfo || null
        },

        setToken(token) {
            if (token) {
                this.token = token
                this.isLoggedIn = true

                // 如果只是设置token，那么用户名可以设置为一个默认值
                if (!this.username) {
                    this.username = '登录用户'
                }
            }
        },

        logout() {
            this.username = ''
            this.token = ''
            this.isLoggedIn = false
            this.userInfo = null
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