<template>
    <div>
        <h2 class="settings-section-title">界面设置</h2>

        <!-- 主题设置 -->
        <a-card title="主题设置" class="setting-card">
            <a-form layout="vertical"> <a-form-item label="主题模式">
                    <a-radio-group v-model:value="themeConfig.isDarkMode" button-style="solid"
                        @change="onThemeModeChange">
                        <a-radio-button :value="false">浅色模式</a-radio-button>
                        <a-radio-button :value="true">暗色模式</a-radio-button>
                    </a-radio-group>
                </a-form-item>

                <a-form-item label="字体系列">
                    <div class="font-family-container">
                        <a-textarea v-model:value="themeConfig.fontFamily" @change="onFontFamilyChange"
                            placeholder="请输入字体系列，如：&quot;微软雅黑&quot;, Arial, sans-serif" :rows="2"
                            style="margin-bottom: 12px" />
                        <div class="font-preview">
                            <span class="preview-label">预览：</span>
                            <span class="preview-text" :style="{ fontFamily: themeConfig.fontFamily }">
                                拷贝漫画 CopyManga 0123456789
                            </span>
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
                    <a-slider v-model:value="uiConfig.columnsPerRow" :min="1" :max="4" :step="1"
                        :marks="{ 1: '1列', 2: '2列', 3: '3列', 4: '4列' }" />
                </a-form-item>

                <a-form-item label="图片大小">
                    <a-slider v-model:value="uiConfig.imageSize" :min="50" :max="150" :step="10"
                        :marks="{ 50: '50%', 100: '100%', 150: '150%' }" />
                </a-form-item>

                <a-form-item label="图片间距">
                    <a-slider v-model:value="uiConfig.imageGap" :min="0" :max="30" :step="1"
                        :marks="{ 0: '0px', 10: '10px', 30: '30px' }" />
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
    </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { loadUIConfig, updateReaderConfig, DEFAULT_UI_CONFIG } from '@/utils/ui-config'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// 主题配置
const themeConfig = reactive({
    isDarkMode: false,
    fontFamily: '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace'
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

// UI配置相关方法
const loadUISettings = () => {
    loadUIConfig().then(config => {
        // 加载阅读器配置
        Object.assign(uiConfig, config.reader)        // 加载主题配置
        themeConfig.isDarkMode = config.theme?.isDarkMode || false
        themeConfig.fontFamily = config.theme?.fontFamily || '"Cascadia Code", "霞鹜文楷", "喵字果汁体", "微软雅黑", "Courier New", Courier, monospace'
    }).catch(error => {
        message.error('加载配置失败')
    })
}

const saveUISettings = () => {
    savingUI.value = true

    updateReaderConfig(uiConfig).then(success => {
        if (success) {
            message.success('界面设置保存成功！')
        } else {
            message.error('保存界面设置失败')
        }
    }).catch(error => {
        message.error('保存界面设置失败')
    }).finally(() => {
        savingUI.value = false
    })
}

const resetUIToDefault = () => {
    Object.assign(uiConfig, DEFAULT_UI_CONFIG.reader)
    message.info('已恢复默认设置')
}

onMounted(() => {
    loadUISettings()
})
</script>

<style scoped>
.setting-card {
    margin-bottom: 24px;
}

.font-family-container {
    width: 100%;
}

.font-preview {
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 6px;
    border: 1px solid #d9d9d9;
}

.preview-label {
    font-size: 14px;
    color: #666;
    margin-right: 8px;
}

.preview-text {
    font-size: 16px;
    color: #333;
}

/* 暗色主题样式 */
html.dark .preview-label {
    color: #cccccc;
}

html.dark .font-preview {
    background-color: #2a2a2a;
    border-color: #434343;
}

html.dark .preview-text {
    color: #e0e0e0;
}
</style>
