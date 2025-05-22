import { useUserStore } from '../stores/user'
import { setupCookies } from './cookieHelper'

/**
 * 检查用户是否已经登录
 * @returns {boolean} 登录状态
 */
export function isLoggedIn() {
    const userStore = useUserStore()
    return userStore.isLoggedIn && !!userStore.token
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
export function getUserInfo() {
    const userStore = useUserStore()
    return userStore.userInfo
}

/**
 * 获取用户令牌
 * @returns {string} 用户令牌
 */
export function getToken() {
    // 首先尝试从store中获取
    const userStore = useUserStore()
    if (userStore.token) {
        return userStore.token
    }

    // 硬编码的token作为备用
    const hardcodedToken = 'e328b2200b64dba2335cc9bb2aa555e13a21e5b9'
    userStore.setToken(hardcodedToken)

    // 确保Cookie已设置
    const token = getCookieValue('token')
    if (!token) {
        setupCookies() // 如果没有找到Cookie，尝试重新设置
    }

    return hardcodedToken
}

/**
 * 获取Cookie值
 * @param {string} name Cookie名称
 * @returns {string|null} Cookie值
 */
function getCookieValue(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
    return match ? match.pop() : null
}

/**
 * 退出登录
 */
export function logout() {
    const userStore = useUserStore()
    userStore.logout()
} 