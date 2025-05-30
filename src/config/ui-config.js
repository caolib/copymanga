import { pathHelper, CONFIG_FILES } from '@/utils/path-helper'

// 默认UI配置
const DEFAULT_UI_CONFIG = {
    theme: {
        isDarkMode: false, // 默认浅色主题
        fontFamily: '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace', // 字体系列
        darkImageMask: 0.3 // 暗色模式图片遮罩透明度 (0-1，0为无遮罩，1为完全遮罩)
    },
    reader: {
        layout: 'rtl', // 从右到左（默认，日漫风格）
        columnsPerRow: 2, // 一行显示的列数
        imageSize: 100, // 图片大小百分比
        imageGap: 8 // 图片间距，单位px
    }
}

// 加载UI配置
async function loadUIConfig() {
    const config = await pathHelper.readConfig(CONFIG_FILES.UI, DEFAULT_UI_CONFIG)
    return { ...DEFAULT_UI_CONFIG, ...config }
}

// 保存UI配置
async function saveUIConfig(config) {
    return await pathHelper.saveConfig(CONFIG_FILES.UI, config)
}

// 更新UI配置
async function updateUIConfig(newConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = { ...currentConfig, ...newConfig }
    return await saveUIConfig(updatedConfig)
}

// 更新阅读器配置
async function updateReaderConfig(readerConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = {
        ...currentConfig,
        reader: {
            ...currentConfig.reader,
            ...readerConfig
        }
    }
    return await saveUIConfig(updatedConfig)
}

// 更新主题配置
async function updateThemeConfig(themeConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = {
        ...currentConfig,
        theme: {
            ...currentConfig.theme,
            ...themeConfig
        }
    }
    return await saveUIConfig(updatedConfig)
}

export {
    loadUIConfig,
    saveUIConfig,
    updateUIConfig,
    updateReaderConfig,
    updateThemeConfig,
    DEFAULT_UI_CONFIG
}