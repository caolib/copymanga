<template>
    <div>
        <a-card title="主题设置" class="setting-card">
            <a-form layout="vertical"> <a-form-item label="主题模式">
                    <a-radio-group v-model:value="themeConfig.isDarkMode" button-style="solid"
                        @change="onThemeModeChange">
                        <a-radio-button :value="false">浅色模式</a-radio-button>
                        <a-radio-button :value="true">暗色模式</a-radio-button>
                    </a-radio-group>
                </a-form-item> <a-form-item label="字体系列">
                    <div class="font-family-container">
                        <a-textarea v-model:value="themeConfig.fontFamily" @change="onFontFamilyChange"
                            placeholder="请输入字体系列，如：&quot;微软雅黑&quot;, Arial, sans-serif" :rows="2"
                            style="margin-bottom: 12px" />
                        <div class="font-preview">
                            <span class="preview-label">预览：</span>
                            <span class="preview-text" :style="{ fontFamily: themeConfig.fontFamily }">
                                漫画 doki 0123456789
                            </span>
                        </div>
                    </div>
                </a-form-item>

                <a-form-item label="暗色模式图片遮罩" v-if="themeConfig.isDarkMode">
                    <a-slider v-model:value="themeConfig.darkImageMask" class="slider" :min="0" :max="1" :step="0.1"
                        :marks="{ 0: '无遮罩', 0.3: '30%', 0.5: '50%', 1: '完全遮罩' }" @change="onDarkImageMaskChange" />
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        调整暗色模式下图片遮罩的透明度，降低图片亮度以保护视力
                    </div>
                </a-form-item>

                <a-form-item label="自定义CSS样式">
                    <div>
                        <a-space>
                            <a-button type="primary" @click="openCustomCssFile">
                                编辑自定义样式
                            </a-button>
                            <a-switch v-model:checked="showReloadButton" checked-children="显示重载按钮"
                                un-checked-children="隐藏重载按钮" @change="toggleReloadButton" />
                        </a-space>
                        <div style="margin-top: 8px; font-size: 12px; color: #666;">
                            编辑自定义CSS文件，保存后点击顶部重载按钮即可应用样式。
                        </div>
                    </div>
                </a-form-item>
            </a-form>
        </a-card>



        <!-- 阅读器设置 -->
        <a-card title="阅读器设置" class="setting-card">
            <a-form layout="vertical">
                <a-form-item label="漫画布局">
                    <a-radio-group v-model:value="uiConfig.layout" button-style="solid">
                        <a-radio-button value="rtl">从右到左（日漫风格）</a-radio-button>
                        <a-radio-button value="ltr">从左到右</a-radio-button>
                    </a-radio-group>
                </a-form-item>

                <a-form-item label="每行列数">
                    <a-slider v-model:value="uiConfig.columnsPerRow" :min="1" :max="4" :step="1" class="slider"
                        :marks="{ 1: '1列', 2: '2列', 3: '3列', 4: '4列' }" />
                </a-form-item>

                <a-form-item label="图片大小">
                    <a-slider v-model:value="uiConfig.imageSize" :min="50" :max="100" :step="10" class="slider"
                        :marks="{ 50: '50%', 100: '100%' }" />
                </a-form-item> <a-form-item label="图片间距">
                    <a-slider v-model:value="uiConfig.imageGap" :min="0" :max="30" :step="1" class="slider"
                        :marks="{ 0: '0px', 10: '10px', 30: '30px' }" />
                </a-form-item>

                <a-form-item label="空白页位置">
                    <a-radio-group v-model:value="uiConfig.blankPagePosition">
                        <a-radio value="start">开头</a-radio>
                        <a-radio value="end">末尾</a-radio>
                    </a-radio-group>
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        双列显示时，当图片数量为奇数，决定在开头还是末尾添加空白页
                    </div>
                </a-form-item>

                <a-form-item>
                    <a-space>
                        <a-button type="primary" @click="saveUISettings" :loading="savingUI" size="large">
                            保存设置
                        </a-button>
                        <a-button @click="resetUIToDefault" size="large">
                            恢复默认
                        </a-button>
                    </a-space>
                </a-form-item>
            </a-form>
        </a-card>

        <!-- 系统设置 -->
        <a-card title="系统设置" class="setting-card">
            <a-form layout="vertical">
                <a-form-item label="托盘图标">
                    <a-switch v-model:checked="systemConfig.showTrayIcon" @change="onTrayIconToggle" />
                </a-form-item>
            </a-form>
        </a-card>

    </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { loadUIConfig, updateReaderConfig, updateSystemConfig, DEFAULT_UI_CONFIG } from '@/config/ui-config'
import { useThemeStore } from '@/stores/theme'
import { initTray, destroyTray } from '@/utils/tray'
import { invoke } from '@tauri-apps/api/core'

const themeStore = useThemeStore()
const showReloadButton = ref(themeStore.showReloadCssButton)

// 主题配置
const themeConfig = reactive({
    isDarkMode: false,
    fontFamily: '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace',
    darkImageMask: 0.3 // 暗色模式图片遮罩透明度
})

// 系统配置
const systemConfig = reactive({
    showTrayIcon: false
})

// UI界面设置
const uiConfig = reactive({ ...DEFAULT_UI_CONFIG.reader })
const savingUI = ref(false)

// 主题相关方法
const onThemeModeChange = () => {
    themeStore.setTheme(themeConfig.isDarkMode)
}

const onFontFamilyChange = () => {
    themeStore.setFontFamily(themeConfig.fontFamily)
}

const onDarkImageMaskChange = async () => {
    // 暗色模式图片遮罩变化时立即保存
    const { updateThemeConfig } = await import('@/config/ui-config')
    await updateThemeConfig({
        darkImageMask: themeConfig.darkImageMask
    }).catch(error => {
        console.error('保存暗色模式图片遮罩设置失败:', error)
    })
}

// 系统配置相关方法
const onTrayIconToggle = async () => {
    // 立即保存设置
    await updateSystemConfig({
        showTrayIcon: systemConfig.showTrayIcon
    })

    // 根据设置启用或禁用托盘图标
    if (systemConfig.showTrayIcon) {
        await initTray().catch(error => {
            console.error('初始化托盘图标失败:', error)
            systemConfig.showTrayIcon = false
        })
    } else {
        await destroyTray()
    }
}

// UI配置相关方法
const loadUISettings = () => {
    loadUIConfig().then(config => {
        // 加载阅读器配置
        Object.assign(uiConfig, config.reader)
        // 加载主题配置
        themeConfig.isDarkMode = config.theme?.isDarkMode || false
        themeConfig.fontFamily = config.theme?.fontFamily || '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace'
        themeConfig.darkImageMask = config.theme?.darkImageMask || 0.3
        // 加载系统配置
        systemConfig.showTrayIcon = config.system?.showTrayIcon || false
    }).catch(error => {
        message.error('加载配置失败')
    })
}

const saveUISettings = () => {
    savingUI.value = true

    updateReaderConfig(uiConfig).then(success => {
        message.success('保存成功！')
    }).catch(error => {
        message.error('保存界面设置失败')
        console.error('保存界面设置失败:', error)
    }).finally(() => {
        savingUI.value = false
    })
}

const resetUIToDefault = () => {
    Object.assign(uiConfig, DEFAULT_UI_CONFIG.reader)
    message.info('已恢复默认设置')
}

// 打开自定义CSS文件
const openCustomCssFile = async () => {
    try {
        await invoke('open_or_create_custom_css')
        message.success('已打开自定义CSS文件')
    } catch (error) {
        console.error('打开自定义CSS文件失败:', error)
        message.error('打开自定义CSS文件失败')
    }
}

// 切换顶部栏重载按钮显示状态
const toggleReloadButton = (checked) => {
    themeStore.setShowReloadCssButton(checked)
    if (checked) {
        message.success('已在顶部栏显示重载样式按钮')
    } else {
        message.info('已隐藏顶部栏重载样式按钮')
    }
}

onMounted(() => {
    loadUISettings()
})
</script>

<style src="../../assets/styles/appearance-settings.scss" lang="scss" scoped></style>
