import CryptoJS from 'crypto-js';

/**
 * 解密 CopyManga API 返回的加密数据
 * @param {string} encryptedData - API 返回的加密数据
 * @returns {object} 解密后的数据对象
 */
export function decryptMangaData(encryptedData) {
    try {
        // 提取前16位作为IV
        const iv = encryptedData.substring(0, 16);
        // 获取剩余的密文
        const cipher = encryptedData.substring(16);

        // 解密过程
        const result = JSON.parse(CryptoJS.AES.decrypt(
            CryptoJS.enc.Base64.stringify(
                CryptoJS.enc.Hex.parse(cipher)
            ),
            CryptoJS.enc.Utf8.parse('xxxmanga.woo.key'),
            {
                'iv': CryptoJS.enc.Utf8.parse(iv),
                'mode': CryptoJS.mode.CBC,
                'padding': CryptoJS.pad.Pkcs7
            }
        ).toString(CryptoJS.enc.Utf8));

        return result;
    } catch (error) {
        console.error('解密数据失败:', error);
        throw new Error('解密数据失败');
    }
}

/**
 * 处理漫画章节数据，添加类型名称和索引
 * @param {object} decryptedData - 解密后的数据
 * @returns {array} 处理后的章节数组
 */
export function processChapterData(decryptedData) {
    try {
        // 创建类型映射
        const typeMap = new Map();
        decryptedData.build.type.forEach(v => {
            typeMap.set(v.id, v.name);
        });

        // 处理每个章节
        const chapters = decryptedData.groups.default.chapters;
        chapters.forEach((v, index) => {
            v.index = index;
            const typeName = typeMap.get(v.type);
            v.name = `【${typeName}】${v.name}`;
            v.type_name = typeName;
        });

        return chapters;
    } catch (error) {
        console.error('处理章节数据失败:', error);
        throw new Error('处理章节数据失败');
    }
}
