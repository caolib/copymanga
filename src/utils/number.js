const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
}

const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

export {
    formatNumber,
    formatFileSize
}