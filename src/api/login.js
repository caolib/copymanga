import request from '../utils/request'
import { getDefaultRequestHeaders } from '../config/server-config'

/**
 * 生成加密参数（简化版本，实际项目中这些应该从加密库生成）
 */
function generateAuthParams() {
    const salt = Math.floor(100000 + Math.random() * 900000).toString()
    const now = new Date()
    const dt = now.toISOString().slice(0, 10).replace(/-/g, '.')

    // 从server-config获取默认值
    const defaultHeaders = getDefaultRequestHeaders()

    const pseudoID = Math.random().toString(36).substring(2, 18)
    const umString = Math.random().toString(36).substring(2, 34)
    const _umString = Math.random().toString(36).substring(2, 34)
    const deviceInfo = defaultHeaders.deviceinfo || 'PGEM10-star2qltechn'
    const androidId = `PQ3B.190801.${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`

    return {
        salt,
        dt,
        pseudoID,
        umString,
        _umString,
        deviceInfo,
        androidId,
        AES: 'EgD31Vkbxtt9fkZFjsnnCC yR/Ix999OyCRUhBwtTjwF7ZAq8SY4K0wJjL42uGzJ',
        _ae: 'K8mhmiJBz0ugUR7avwajVmVzHleBwKA/22CL2UkXkZw zjPUfDeUvsO5DwPUU1bn',
        defaultHeaders
    }
}

/**
 * 用户登录 
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise} 登录结果
 */
function login(username, password) {
    const authParams = generateAuthParams()
    const { defaultHeaders } = authParams

    // 创建请求数据对象，不使用FormData
    const loginData = {
        username: username,
        password: btoa(`${password}-${authParams.salt}`),
        salt: authParams.salt,
        platform: defaultHeaders.platform || '3',
        authorization: 'Token ',
        version: defaultHeaders.version || '2.3.1',
        source: defaultHeaders.source || 'copyApp',
        region: defaultHeaders.region || '1',
        webp: defaultHeaders.webp || '1',
        userAgent: defaultHeaders["user-agent"] || 'COPY/2.3.1',
        isGoogle: 'false',
        pseudoID: authParams.pseudoID,
        dt: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        umString: authParams.umString,
        AES: authParams.AES,
        _umString: authParams._umString,
        _ae: authParams._ae,
        buildTime: '2025.05.22',
        androidId: authParams.androidId,
        referer: defaultHeaders.referer || 'com.copymanga.app-2.3.1',
        deviceInfo: authParams.deviceInfo
    }

    return request.post('/api/v3/login', loginData, {
        params: {
            platform: defaultHeaders.platform || '3'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 60000
    })
}

/**
 * 用户注册 
 * @param {string} username 用户名 (6-36位英文数字混合)
 * @param {string} password 密码 (6-36位英文数字混合)
 * @param {object} options 可选参数 {mobile, code, invite_code, question, answer}
 * @returns {Promise} 注册结果
 */
function register(username, password, options = {}) {
    const authParams = generateAuthParams()
    const { defaultHeaders } = authParams

    // 创建请求数据对象，不使用FormData
    const registerData = {
        username: username,
        password: password,
        mobile: options.mobile || '',
        region: defaultHeaders.region || '1',
        code: options.code || '',
        source: defaultHeaders.source || 'copyApp',
        version: defaultHeaders.version || '2.3.1',
        platform: defaultHeaders.platform || '3',
        invite_code: options.invite_code || '',
        question: options.question || '',
        answer: options.answer || '',
        authorization: 'Token ',
        webp: defaultHeaders.webp || '1',
        userAgent: defaultHeaders["user-agent"] || 'COPY/2.3.1',
        isGoogle: 'false',
        pseudoID: authParams.pseudoID,
        dt: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        umString: authParams.umString,
        AES: authParams.AES,
        _umString: authParams._umString,
        _ae: authParams._ae,
        buildTime: '2025.05.22',
        androidId: authParams.androidId,
        referer: defaultHeaders.referer || 'com.copymanga.app-2.3.1',
        deviceInfo: authParams.deviceInfo
    }

    return request.post('/api/v3/register', registerData, {
        params: {
            platform: defaultHeaders.platform || '3'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 60000
    })
}



export {
    login,
    register
}

