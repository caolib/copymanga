import { useUserStore } from '../stores/user'

/**
 * 检查用户是否已经登录
 * @returns {boolean} 登录状态
 */
export function isLoggedIn() {
  const userStore = useUserStore()
  return userStore.isLoggedIn && !!userStore.token
}
/**
 * 获取用户令牌
 * @returns {string} 用户令牌
 */
export function getToken() {
  // 首先尝试从store中获取
  const userStore = useUserStore()
  return userStore.token
}

/**
 * 退出登录
 */
export function logout() {
  const userStore = useUserStore()
  userStore.logout()
}
