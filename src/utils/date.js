/**
 * 格式化时间戳或日期字符串
 * - 如果输入是 'yyyy-MM-dd' 格式的字符串且日期代表的时间点在一个月之前，则直接返回该输入字符串。
 * - 如果日期代表的时间点在一个月之内，则返回相对时间描述（例如，“刚刚”，“5分钟前”，“3天前”，“2周前”）。
 * - 如果日期代表的时间点在一个月之前（且输入不是按上述特殊规则处理的 'yyyy-MM-dd' 字符串），则返回 'yyyy-MM-dd HH:mm:ss' 格式的字符串。
 * - 对于无效输入（无法解析为有效日期，或输入为空），返回空字符串。
 *
 * @param {number|string} input 时间戳（毫秒数）或日期字符串 (例如 '2023-10-26', '2023-10-26T14:30:00', 1698300000000)。
 * @returns {string} 格式化后的日期时间字符串，或相对时间字符串，或空字符串。
 */
const formatDate = (input) => {
    if (!input) return '';

    const date = new Date(input);
    if (isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const diff = now - date;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;

    const yyyyMMddRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof input === 'string' && yyyyMMddRegex.test(input)) {
        if (diff >= month) {
            return input;
        }
    }

    if (diff >= month) {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0') + ':' +
            String(date.getSeconds()).padStart(2, '0');
    }

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < week) return `${Math.floor(diff / day)}天前`;
    return `${Math.floor(diff / week)}周前`;
}

// 生成当前日期字符串 (YYYY.MM.DD 格式)
const getCurrentDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
}

export {
    formatDate,
    getCurrentDate
}