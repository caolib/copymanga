import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadUIConfig, updateThemeConfig } from '../utils/ui-config'

export const useThemeStore = defineStore('theme', () => {    // 主题状态
    const isDarkMode = ref(false)
    const fontFamily = ref('"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace')

    // 预设字体系列选项（用于快速选择）
    const fontFamilyPresets = [
        { name: '系统默认', value: '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace' },
        { name: '霞鹜文楷', value: '"霞鹜文楷", "微软雅黑", sans-serif' },
        { name: '喵字果汁体', value: '"喵字果汁体", "微软雅黑", sans-serif' },
        { name: '微软雅黑', value: '"微软雅黑", sans-serif' },
        { name: 'Cascadia Code', value: '"Cascadia Code", "Courier New", Courier, monospace' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Times New Roman', value: '"Times New Roman", serif' }
    ]

    // 切换主题
    const toggleTheme = async () => {
        isDarkMode.value = !isDarkMode.value
        updateThemeClass()
        await saveThemeConfig()
    }

    // 设置主题
    const setTheme = async (dark) => {
        isDarkMode.value = dark
        updateThemeClass()
        await saveThemeConfig()
    }    // 设置字体系列
    const setFontFamily = async (font) => {
        fontFamily.value = font
        updateFontFamily()
        await saveThemeConfig()
    }    // 保存主题配置
    const saveThemeConfig = async () => {
        await updateThemeConfig({
            isDarkMode: isDarkMode.value,
            fontFamily: fontFamily.value
        }).catch(error => {
            console.error('保存主题配置失败:', error)
        })
    }// 更新HTML根元素的主题类
    const updateThemeClass = () => {
        const html = document.documentElement
        if (isDarkMode.value) {
            html.classList.add('dark')
        } else {
            html.classList.remove('dark')
        }
    }    // 更新字体系列
    const updateFontFamily = () => {
        document.documentElement.style.setProperty('--font-family', fontFamily.value)
    }// 初始化主题
    const initTheme = async () => {
        try {
            const config = await loadUIConfig()
            isDarkMode.value = config.theme?.isDarkMode || false
            fontFamily.value = config.theme?.fontFamily || '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace'

            updateThemeClass()
            updateFontFamily()
        } catch (error) {
            console.error('加载主题配置失败:', error)
            isDarkMode.value = false
            fontFamily.value = '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace'

            updateThemeClass()
            updateFontFamily()
        }
    }

    return {
        isDarkMode,
        fontFamily,
        fontFamilyPresets,
        toggleTheme,
        setTheme,
        setFontFamily,
        initTheme
    }
})