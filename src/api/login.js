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

    return request.post('/api/kb/web/login', params, {
        timeout: 60000
    });
}

/**
 * 用户注册
 * @param {string} username 用户名 (6-36位英文数字混合)
 * @param {string} password 密码 (6-36位英文数字混合)
 * @returns {Promise} 注册结果
 */
export function register(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('source', 'freeSite');
    params.append('platform', '2');
    params.append('code', '');
    params.append('invite_code', '');
    params.append('version', '2022.12.12');
    params.append('question', '');
    params.append('answer', '');

    return request.post('/api/kb/web/register', params, {
        headers: {
            'platform': '2',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        timeout: 60000
    });
}

/**
 * 获取用户信息
 * @returns {Promise} 用户信息
 */
export function getUserProfile() {
    return request.get('/api/v2/web/user/info', {
        headers: {
            'Content-Encoding': 'gzip, compress, br',
            'platform': '2'
        },
        timeout: 60000
    });
}


