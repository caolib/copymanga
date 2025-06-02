<template>
    <div class="book-text-reader">
        <!-- 工具栏 -->
        <div class="toolbar">
            <a-button type="text" @click="goBack" :icon="h(ArrowLeftOutlined)">
                返回
            </a-button>
            <div class="reading-info" v-if="!loading && !error">
                <span>共 {{ totalLines }} 行</span>
                <span>|</span>
                <span>当前进度: {{ Math.round(scrollPercentage) }}%</span>
            </div>
            <a-button type="text" @click="showSettingsDrawer = true" :icon="h(SettingOutlined)">
                设置
            </a-button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <a-skeleton active :paragraph="{ rows: 20 }" />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
            <a-result status="error" :title="error">
                <template #extra>
                    <a-button type="primary" @click="loadTextContent">重试</a-button>
                </template>
            </a-result>
        </div>

        <!-- 虚拟滚动文本内容 -->
        <div v-else class="reader-content" ref="readerContainer" @scroll="handleScroll">
            <div class="text-content" :style="{ height: totalHeight + 'px' }">
                <!-- 上方占位器 -->
                <div :style="{ height: topSpacerHeight + 'px' }"></div>

                <!-- 可见行 -->
                <div v-for="(line, index) in visibleLines" :key="startIndex + index" class="text-line"
                    :style="textLineStyle" :ref="(el) => measureLineHeight(el, startIndex + index)">
                    {{ line }}
                </div>

                <!-- 下方占位器 -->
                <div :style="{ height: bottomSpacerHeight + 'px' }"></div>
            </div>
        </div>

        <!-- 设置抽屉 -->
        <a-drawer title="阅读设置" :width="320" :open="showSettingsDrawer" @close="showSettingsDrawer = false"
            placement="right">
            <a-form layout="vertical">
                <a-form-item label="字体">
                    <a-select v-model:value="readerSettings.fontFamily" @change="onSettingsChange">
                        <a-select-option value="var(--font-family)">默认字体 (Cascadia Code, 霞鹜文楷等)</a-select-option>
                        <a-select-option
                            value='"微软雅黑", "PingFang SC", "Hiragino Sans GB", sans-serif'>微软雅黑</a-select-option>
                        <a-select-option value='"霞鹜文楷", "微软雅黑", sans-serif'>霞鹜文楷</a-select-option>
                        <a-select-option value='"楷体", "KaiTi", serif'>楷体</a-select-option>
                        <a-select-option value='"宋体", "SimSun", serif'>宋体</a-select-option>
                        <a-select-option value='"黑体", "SimHei", sans-serif'>黑体</a-select-option>
                        <a-select-option value='"Arial", "Helvetica", sans-serif'>Arial</a-select-option>
                        <a-select-option value='"Times New Roman", serif'>Times New Roman</a-select-option>
                        <!-- 显示已添加的自定义字体 -->
                        <a-select-option v-for="font in addedFonts" :key="font" :value="font">
                            {{ font.split(',')[0].replace(/"/g, '') }} (自定义)
                        </a-select-option>
                    </a-select>

                    <!-- 自定义字体输入 -->
                    <div style="margin-top: 8px;">
                        <a-input v-model:value="customFontInput" placeholder="输入自定义字体名称，如：Source Han Sans"
                            @press-enter="addCustomFont" />
                        <a-button type="link" size="small" @click="addCustomFont" :disabled="!customFontInput.trim()">
                            添加自定义字体
                        </a-button>
                    </div>

                    <!-- 已添加的自定义字体列表 -->
                    <div v-if="addedFonts.length > 0" style="margin-top: 12px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">已添加的自定义字体：</div>
                        <div v-for="font in addedFonts" :key="font" class="custom-font-item">
                            <span>{{ font }}</span>
                            <a-button type="text" size="small" danger @click="removeCustomFont(font)">
                                删除
                            </a-button>
                        </div>
                    </div>
                </a-form-item>

                <a-form-item label="字体大小">
                    <a-slider v-model:value="readerSettings.fontSize" :min="10" :max="30" :step="1"
                        :marks="{ 10: '10px', 16: '16px', 20: '20px', 30: '30px' }" @change="onSettingsChange" />
                    <div class="setting-value">{{ readerSettings.fontSize }}px</div>
                </a-form-item>

                <a-form-item label="行高">
                    <a-slider v-model:value="readerSettings.lineHeight" :min="1.2" :max="3" :step="0.1"
                        :marks="{ 1.2: '1.2', 2: '2', 2.5: '2.5', 3: '3' }" @change="onSettingsChange" />
                    <div class="setting-value">{{ readerSettings.lineHeight }}</div>
                </a-form-item>

                <a-form-item>
                    <a-space>
                        <a-button type="primary" @click="saveSettings" :loading="savingSettings">
                            保存设置
                        </a-button>
                        <a-button @click="resetSettings">
                            恢复默认
                        </a-button>
                    </a-space>
                </a-form-item>
            </a-form>
        </a-drawer>
    </div>
</template>

<script setup>
import { ref, onMounted, h, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { getBookTextContent } from '@/api/book'
import { loadUIConfig, updateTextReaderConfig } from '@/utils/ui-config'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(true)
const error = ref('')
const textContent = ref('')
const readerContainer = ref(null)
const scrollPercentage = ref(0)

// 设置相关状态
const showSettingsDrawer = ref(false)
const savingSettings = ref(false)
const customFontInput = ref('')
const addedFonts = ref([]) // 记录已添加的自定义字体
const readerSettings = ref({
    fontFamily: 'var(--font-family)', // 使用main.scss中定义的默认字体
    fontSize: 16,
    lineHeight: 2
})

// 虚拟滚动相关状态
const visibleCount = ref(30) // 可见行数
const bufferCount = 5 // 缓冲行数
const startIndex = ref(0) // 开始渲染的行索引
const endIndex = ref(29) // 结束渲染的行索引
const lineHeights = ref(new Map()) // 存储每行的实际高度

// 计算动态行高（基础行高，用于估算）
const baseLineHeight = computed(() => {
    return readerSettings.value.fontSize * readerSettings.value.lineHeight
})

// 获取指定行的高度（如果已测量则返回实际高度，否则返回估算高度）
const getLineHeight = (index) => {
    return lineHeights.value.get(index) || baseLineHeight.value
}

// 测量行高
const measureLineHeight = (element, index) => {
    if (element && element.offsetHeight > 0) {
        const currentHeight = lineHeights.value.get(index)
        const newHeight = element.offsetHeight

        // 只有高度发生变化时才更新
        if (currentHeight !== newHeight) {
            lineHeights.value.set(index, newHeight)

            // 如果高度变化较大，重新计算可见范围
            if (Math.abs((currentHeight || baseLineHeight.value) - newHeight) > 5) {
                nextTick(() => {
                    updateVisibleRange()
                })
            }
        }
    }
}

// 计算属性：将文本按行分割并过滤空行
const textLines = computed(() => {
    if (!textContent.value) return []
    return textContent.value.split('\n').filter(line => line !== null && line !== undefined && line.trim() !== '')
})

// 计算总行数
const totalLines = computed(() => textLines.value.length)

// 计算总高度（基于实际测量或估算）
const totalHeight = computed(() => {
    let height = 0
    for (let i = 0; i < totalLines.value; i++) {
        height += getLineHeight(i)
    }
    return height
})

// 文本行样式
const textLineStyle = computed(() => ({
    fontFamily: readerSettings.value.fontFamily,
    fontSize: `${readerSettings.value.fontSize}px`,
    lineHeight: readerSettings.value.lineHeight,
    // 移除固定高度，让内容自然决定高度
    minHeight: `${baseLineHeight.value}px`
}))

// 可见行数据
const visibleLines = computed(() => {
    const start = startIndex.value
    const end = Math.min(endIndex.value + 1, totalLines.value)
    return textLines.value.slice(start, end)
})

// 上方占位器高度
const topSpacerHeight = computed(() => {
    let height = 0
    for (let i = 0; i < startIndex.value; i++) {
        height += getLineHeight(i)
    }
    return height
})

// 下方占位器高度
const bottomSpacerHeight = computed(() => {
    let height = 0
    for (let i = endIndex.value + 1; i < totalLines.value; i++) {
        height += getLineHeight(i)
    }
    return height
})

// 计算可见范围
const updateVisibleRange = () => {
    if (!readerContainer.value || totalLines.value === 0) return

    const container = readerContainer.value
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight

    // 基于累积高度计算当前可见的第一行
    let currentHeight = 0
    let firstVisibleLine = 0

    for (let i = 0; i < totalLines.value; i++) {
        const lineHeight = getLineHeight(i)
        if (currentHeight + lineHeight > scrollTop) {
            firstVisibleLine = i
            break
        }
        currentHeight += lineHeight
    }

    // 计算可见行数（基于容器高度和平均行高）
    const avgLineHeight = baseLineHeight.value
    const baseVisibleCount = Math.ceil(containerHeight / avgLineHeight)
    visibleCount.value = baseVisibleCount + bufferCount * 2

    // 设置渲染范围，包含缓冲区
    startIndex.value = Math.max(0, firstVisibleLine - bufferCount)
    endIndex.value = Math.min(totalLines.value - 1, startIndex.value + visibleCount.value - 1)

    // 更新滚动百分比
    const maxScrollTop = Math.max(0, totalHeight.value - containerHeight)
    if (maxScrollTop > 0) {
        scrollPercentage.value = (scrollTop / maxScrollTop) * 100
    } else {
        scrollPercentage.value = 0
    }
}

// 处理滚动事件
const handleScroll = () => {
    throttledHandleScroll()
}

// 返回上一页
const goBack = () => {
    router.back()
}

// 加载文本内容
const loadTextContent = async () => {
    loading.value = true
    error.value = ''

    const txtAddr = route.query.txtAddr
    await getBookTextContent(txtAddr).then(response => {
        textContent.value = response.data
        // console.log('加载文本内容成功:', response)

        // 等待DOM更新后初始化
        nextTick(() => {
            updateVisibleRange()
        })
    }).catch(err => {
        console.error('加载文本内容失败:', err)
        error.value = err.message || '加载文本内容失败'
        message.error('加载文本内容失败')
    }).finally(() => {
        loading.value = false
    })
}

// 监听文本内容变化，重新计算可见范围
watch(textContent, () => {
    nextTick(() => {
        updateVisibleRange()
    })
})

// 监听设置变化，重新计算可见范围
watch(readerSettings, () => {
    // 设置变化时清除行高缓存，因为字体大小可能变化
    lineHeights.value.clear()
    nextTick(() => {
        updateVisibleRange()
    })
}, { deep: true })

// 节流函数，避免滚动时频繁计算
const throttle = (func, delay) => {
    let timeoutId
    let lastExecTime = 0
    return function (...args) {
        const currentTime = Date.now()

        if (currentTime - lastExecTime > delay) {
            func.apply(this, args)
            lastExecTime = currentTime
        } else {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                func.apply(this, args)
                lastExecTime = Date.now()
            }, delay)
        }
    }
}

// 节流的滚动处理函数
const throttledHandleScroll = throttle(updateVisibleRange, 16) // 约60fps

// 设置相关方法
const addCustomFont = () => {
    const customFont = customFontInput.value.trim()
    if (!customFont) {
        message.warning('请输入字体名称')
        return
    }

    // 检查是否已经添加过这个字体
    if (addedFonts.value.includes(customFont)) {
        message.warning('该字体已经添加过了')
        return
    }

    // 验证字体名称格式（基本验证）
    if (customFont.length > 50) {
        message.error('字体名称过长')
        return
    }

    // 记录添加的字体
    addedFonts.value.push(customFont)

    // 将自定义字体添加到字体家族前面
    readerSettings.value.fontFamily = `"${customFont}", ${readerSettings.value.fontFamily}`
    customFontInput.value = ''
    message.success(`已添加自定义字体: ${customFont}`)

    // 触发设置变化
    onSettingsChange()
}

const removeCustomFont = (fontName) => {
    // 从记录中移除
    const index = addedFonts.value.indexOf(fontName)
    if (index > -1) {
        addedFonts.value.splice(index, 1)
    }

    // 从字体家族中移除
    const fontRegex = new RegExp(`"${fontName}",\\s*`, 'g')
    readerSettings.value.fontFamily = readerSettings.value.fontFamily.replace(fontRegex, '')

    message.success(`已移除自定义字体: ${fontName}`)
    onSettingsChange()
}

const loadSettings = async () => {
    await loadUIConfig().then(config => {
        if (config.textReader) {
            Object.assign(readerSettings.value, config.textReader)

            // 解析已添加的自定义字体
            if (config.textReader.addedFonts) {
                addedFonts.value = [...config.textReader.addedFonts]
            }
        }
    }).catch(err => {
        console.error('加载阅读设置失败:', err)
    })
}

const onSettingsChange = () => {
    // 设置变化时立即更新显示，但不保存
    nextTick(() => {
        updateVisibleRange()
    })
}

const saveSettings = async () => {
    savingSettings.value = true

    const settingsToSave = {
        ...readerSettings.value,
        addedFonts: [...addedFonts.value] // 保存已添加的自定义字体列表
    }

    await updateTextReaderConfig(settingsToSave).then(() => {
        message.success('设置保存成功')
        showSettingsDrawer.value = false
    }).catch(err => {
        console.error('保存设置失败:', err)
        message.error('保存设置失败')
    }).finally(() => {
        savingSettings.value = false
    })
}

const resetSettings = () => {
    readerSettings.value = {
        fontFamily: 'var(--font-family)', // 使用main.scss中定义的默认字体
        fontSize: 16,
        lineHeight: 1.8
    }
    addedFonts.value = [] // 清空自定义字体
    message.info('已恢复默认设置')
}

// 组件挂载时加载文本和设置
onMounted(() => {
    loadSettings()
    loadTextContent()
})
</script>

<style scoped src="../assets/styles/book-text-reader-view.scss" lang="scss"></style>