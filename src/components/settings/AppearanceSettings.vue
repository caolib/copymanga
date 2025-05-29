<template>
    <div>
        <h2 class="settings-section-title">界面设置</h2>

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

// UI界面设置
const uiConfig = reactive({ ...DEFAULT_UI_CONFIG.reader })
const savingUI = ref(false)

// UI配置相关方法
const loadUISettings = () => {
    loadUIConfig().then(config => {
        Object.assign(uiConfig, config.reader)
    }).catch(error => {
        message.error('加载UI配置失败')
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
/* 这里可以添加特定于界面设置的样式 */
</style>
