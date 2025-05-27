import axios from 'axios';

/**
 * 获取最新的发布版本信息
 * @returns {Promise<Object>} 发布信息
 */
const getLatestRelease = async () => {
    const response = await axios.get('https://api.github.com/repos/caolib/copymanga/releases/latest');
    return response.data;
};

/**
 * 获取最新的发布版本号
 * @returns {Promise<string>} 版本号
 */
const getLatestReleaseVersion = async () => {
    const release = await getLatestRelease();
    console.log('Latest release version:', release.tag_name);
    return release.tag_name;
};

/**
 * 比较版本号
 * @param {string} version1 版本1
 * @param {string} version2 版本2
 * @returns {number} 1表示version1较新，-1表示version2较新，0表示相同
 */
const compareVersions = (version1, version2) => {
    // 移除前缀字符（如 app-v, v 等）
    const cleanVersion1 = version1.replace(/^(app-)?v?/, '');
    const cleanVersion2 = version2.replace(/^(app-)?v?/, '');

    const parts1 = cleanVersion1.split('.').map(Number);
    const parts2 = cleanVersion2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
};

/**
 * 检查是否有新版本
 * @param {string} currentVersion 当前版本
 * @returns {Promise<Object>} 包含是否有更新和发布信息
 */
const checkForUpdates = async (currentVersion) => {
    try {
        const release = await getLatestRelease();
        const latestVersion = release.tag_name;

        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

        return {
            hasUpdate,
            currentVersion,
            latestVersion,
            release: hasUpdate ? release : null
        };
    } catch (error) {
        console.error('检查更新失败:', error);
        throw new Error('检查更新失败');
    }
};

export {
    getLatestRelease,
    getLatestReleaseVersion,
    compareVersions,
    checkForUpdates
};
