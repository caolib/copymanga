import request from '../utils/request'

/**
 * 用户登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @param {string} salt 盐值
 * @returns {Promise} 登录结果
 */
export function login(username, password, salt = '123123') {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', btoa(`${password}-${salt}`));
    params.append('salt', salt);

    return request.post('/api/kb/web/login', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
}