import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: '',
        token: '',
        isLoggedIn: false,
        userInfo: null
    }),

    actions: {
        setUser(userData) {
            this.username = userData.username
            this.token = userData.token
            this.isLoggedIn = true
            this.userInfo = userData.userInfo || null
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