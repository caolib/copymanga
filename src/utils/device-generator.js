/**
 * 设备信息随机生成器
 * 用于生成合理的Android设备信息
 */

// 常见的Android设备型号
const DEVICE_MODELS = [
    'PGEM10-star2qltechn',
    'SM-G973F-beyond1lte',
    'SM-G975F-beyond2lte',
    'SM-N975F-d2q',
    'Pixel-3-blueline',
    'Pixel-4-flame',
    'Pixel-5-redfin',
    'OnePlus-7T-hotdogb',
    'OnePlus-8-instantnoodle',
    'Mi-9-cepheus',
    'Mi-10-umi',
    'Mate-30-TAS-AN00',
    'P30-Pro-ELE-L29',
    'Nova-5T-YAL-L21',
    'Reno-10x-zoom-OP46C3',
    'K30-M2001J2G',
    'Note-9-Pro-joyeuse',
    'ROG-Phone-3-ASUS-I003DD',
    'Xperia-1-J9110',
    'V60-ThinQ-LM-V600N'
]

// Android版本构建号格式
const BUILD_PATTERNS = [
    'PQ3B.190801.{random}',
    'QKQ1.200{random}.{random}',
    'RKQ1.201{random}.{random}',
    'SKQ1.210{random}.{random}',
    'TKQ1.220{random}.{random}',
    'UKQ1.230{random}.{random}'
]

/**
 * 生成随机数字字符串
 * @param {number} length 长度
 * @returns {string} 随机数字字符串
 */
function generateRandomNumber(length) {
    let result = ''
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10)
    }
    return result
}

/**
 * 生成随机字母数字字符串
 * @param {number} length 长度
 * @returns {string} 随机字母数字字符串
 */
function generateRandomAlphaNumeric(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * 生成随机设备型号
 * @returns {string} 设备型号
 */
function generateDeviceInfo() {
    const randomIndex = Math.floor(Math.random() * DEVICE_MODELS.length)
    return DEVICE_MODELS[randomIndex]
}

/**
 * 生成随机Android构建号
 * @returns {string} Android构建号
 */
function generateDevice() {
    const pattern = BUILD_PATTERNS[Math.floor(Math.random() * BUILD_PATTERNS.length)]
    return pattern.replace(/{random}/g, () => generateRandomNumber(6))
}

/**
 * 生成随机pseudoid
 * @returns {string} pseudoid
 */
function generatePseudoId() {
    // pseudoid格式类似: eQcnVQ78UWD6t8iH (16位字母数字混合)
    return generateRandomAlphaNumeric(16)
}

/**
 * 生成完整的随机设备信息
 * @returns {Object} 包含device、deviceinfo、pseudoid的对象
 */
function generateRandomDeviceInfo() {
    return {
        device: generateDevice(),
        deviceinfo: generateDeviceInfo(),
        pseudoid: generatePseudoId()
    }
}

export {
    generateRandomDeviceInfo,
    generateDevice,
    generateDeviceInfo,
    generatePseudoId
}
