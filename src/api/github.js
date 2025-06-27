import axios from 'axios';

/**
 * 获取最新的发布版本信息
 * @returns {Promise<Object>} 发布信息
 */
const getLatestRelease = async () => {
    const response = await axios.get('https://api.github.com/repos/caolib/doki/releases/latest');
    return response.data;
};

/**
 * 获取最新的发布版本号
 * @returns {Promise<string>} 版本号
 */
const getLatestReleaseVersion = async () => {
    const release = await getLatestRelease();
    // console.log('Latest release version:', release.tag_name);
    return release.tag_name;
};

/**
 * 比较版本号
 * @param {string} version1 版本1
 * @param {string} version2 版本2
 * @returns {number} 1表示version1较新，-1表示version2较新，0表示相同
 */
const compareVersions = (version1, version2) => {
    // 参数验证
    if (!version1 || !version2) {
        console.error('compareVersions: 版本号参数不能为空', { version1, version2 });
        return 0;
    }

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
    // 参数验证
    if (!currentVersion) {
        throw new Error('当前版本号不能为空');
    }

    const release = await getLatestRelease();
    const latestVersion = release.tag_name;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
        hasUpdate,
        currentVersion,
        latestVersion,
        release: release // 总是返回release信息，不管是否有更新
    };
};

async function getHeadersConfig() {
    const response = await axios.get('https://raw.githubusercontent.com/caolib/doki/main/docs/config/headers.json');
    // console.log(JSON.stringify(response))
    return response.data;
}


export {
    getLatestRelease,
    getLatestReleaseVersion,
    compareVersions,
    checkForUpdates,
    getHeadersConfig
};
