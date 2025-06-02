import { pathHelper, CONFIG_FILES } from './path-helper'

// 默认UI配置
const DEFAULT_UI_CONFIG = {
    theme: {
        isDarkMode: false, // 默认浅色主题
        fontFamily: '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace' // 字体系列
    },
    reader: {
        layout: 'rtl', // 从右到左（默认，日漫风格）
        columnsPerRow: 2, // 一行显示的列数
        imageSize: 100, // 图片大小百分比
        imageGap: 8 // 图片间距，单位px
    },
    textReader: {
        fontFamily: 'var(--font-family)', // 使用main.scss中定义的默认字体
        fontSize: 16, // 字体大小(px)
        lineHeight: 1.8, // 行高倍数
        addedFonts: [] // 用户添加的自定义字体列表
    }
}

// 加载UI配置
async function loadUIConfig() {
    const config = await pathHelper.readConfig(CONFIG_FILES.UI)

    if (config) {
        return { ...DEFAULT_UI_CONFIG, ...config }
    }

    // 如果文件不存在，创建默认配置文件
    await saveUIConfig(DEFAULT_UI_CONFIG)
    return DEFAULT_UI_CONFIG
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

// 更新文本阅读器配置
async function updateTextReaderConfig(textReaderConfig) {
    const currentConfig = await loadUIConfig()
    const updatedConfig = {
        ...currentConfig,
        textReader: {
            ...currentConfig.textReader,
            ...textReaderConfig
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
    updateTextReaderConfig,
    DEFAULT_UI_CONFIG
}