import request from '../utils/request'

/**
 * 用户登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise} 登录结果
 */
export function login(username, password) {
    const params = new URLSearchParams();
    const salt = Math.floor(100000 + Math.random() * 900000).toString(); // 生成 6 位随机数字
    params.append('username', username);
    params.append('password', btoa(`${password}-${salt}`));
    params.append('salt', salt);

    return request.post('/api/kb/web/login', params);
}
