<template>
    <div class="book-volume-chapters-container">
        <!-- 错误提示 -->
        <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />

        <!-- 加载骨架屏 -->
        <div v-if="loading" class="volume-detail-skeleton">
            <a-skeleton :paragraph="{ rows: 2 }" active />
            <a-skeleton :paragraph="{ rows: 8 }" active title />
        </div>

        <!-- 卷详情内容 -->
        <div v-else-if="volumeDetail" class="volume-detail">
            <!-- 返回按钮和章节导航 -->
            <div class="volume-navigation">
                <a-button type="default" @click="goBack" size="large">
                    <template #icon>
                        <ArrowLeftOutlined />
                    </template>
                    返回轻小说详情
                </a-button>

                <div class="chapter-navigation">
                    <a-button v-if="volumeDetail.volume.prev" @click="goToVolume(volumeDetail.volume.prev)"
                        size="large">
                        <template #icon>
                            <LeftOutlined />
                        </template>
                        上一卷
                    </a-button>

                    <a-button v-if="volumeDetail.volume.next" @click="goToVolume(volumeDetail.volume.next)" size="large"
                        type="primary">
                        下一卷
                        <template #icon>
                            <RightOutlined />
                        </template>
                    </a-button>
                </div>
            </div>

            <!-- 卷信息 -->
            <div class="volume-header">
                <h2 class="volume-title">{{ volumeDetail.volume.name }}</h2>
                <div class="volume-meta">
                    <a-space>
                        <span>第{{ volumeDetail.volume.index + 1 }}卷</span>
                        <span>共 {{ volumeDetail.volume.count }} 个内容</span>
                    </a-space>
                </div>
            </div>

            <!-- 内容列表 -->
            <div class="volume-contents">
                <a-card title="内容列表" size="small">
                    <template #extra>
                        <a-space>
                            <a-radio-group v-model:value="contentFilter">
                                <a-radio-button value="all">全部</a-radio-button>
                                <a-radio-button value="text">文本</a-radio-button>
                                <a-radio-button value="image">插图</a-radio-button>
                            </a-radio-group>
                            <span class="content-count">{{ filteredContents.length }} 项</span>
                        </a-space>
                    </template>

                    <div class="contents-list">
                        <div v-for="(content, index) in filteredContents" :key="index" class="content-item"
                            @click="openContent(content)">
                            <div class="content-info">
                                <span class="content-type-icon">
                                    {{ content.content_type === 1 ? '📖' : '🖼️' }}
                                </span>
                                <div class="content-details">
                                    <h4 class="content-title">{{ content.name }}</h4>
                                    <div class="content-meta">
                                        <span v-if="content.content_type === 1" class="text-lines">
                                            第{{ content.start_lines }}-{{ content.end_lines }}行
                                        </span>
                                        <span v-else class="image-info">插图</span>
                                    </div>
                                </div>
                            </div>
                            <div class="content-action">
                                <a-button type="text" size="small">
                                    {{ content.content_type === 1 ? '阅读' : '查看' }}
                                </a-button>
                            </div>
                        </div>
                    </div>
                </a-card>
            </div>

            <!-- 底部章节导航 -->
            <div class="bottom-navigation">
                <a-button v-if="volumeDetail.volume.prev" @click="goToVolume(volumeDetail.volume.prev)" size="large"
                    block style="margin-bottom: 8px;">
                    <template #icon>
                        <LeftOutlined />
                    </template>
                    上一卷
                </a-button>

                <a-button v-if="volumeDetail.volume.next" @click="goToVolume(volumeDetail.volume.next)" size="large"
                    type="primary" block>
                    下一卷
                    <template #icon>
                        <RightOutlined />
                    </template>
                </a-button>
            </div>

            <!-- 插图查看模态框 -->
            <a-modal v-model:open="imageModalVisible" title="插图查看" width="70%" :footer="null" class="image-modal">
                <div v-if="currentImage" class="image-content">
                    <img :src="currentImage.content" :alt="currentImage.name" class="full-image" />
                    <p class="image-title">{{ currentImage.name }}</p>
                </div>
            </a-modal>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { getVolumeDetail } from '@/api/book'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(true)
const error = ref('')
const volumeDetail = ref(null)
const contentFilter = ref('all')
const imageModalVisible = ref(false)
const currentImage = ref(null)

// 计算属性 - 过滤内容
const filteredContents = computed(() => {
    if (!volumeDetail.value || !volumeDetail.value.volume.contents) {
        return []
    }
    const contents = volumeDetail.value.volume.contents

    switch (contentFilter.value) {
        case 'text':
            return contents.filter(item => item.content_type === 1)
        case 'image':
            return contents.filter(item => item.content_type === 2)
        default:
            return contents
    }
})

// 获取卷的详细信息
const fetchVolumeDetail = async () => {
    loading.value = true
    error.value = ''

    const { pathWord, volumeId } = route.params
    if (!pathWord || !volumeId) {
        error.value = '缺少必要参数'
        loading.value = false
        return
    }

    await getVolumeDetail(pathWord, volumeId).then(response => {
        volumeDetail.value = response.results
    }).catch(err => {
        console.error('获取卷详情失败:', err)
        error.value = err.message || '获取卷详情失败'
    }).finally(() => {
        loading.value = false
    })
}

// 返回上一页
const goBack = () => {
    const pathWord = route.params.pathWord
    router.push(`/book/${pathWord}`)
}

// 跳转到指定卷
const goToVolume = (volumeId) => {
    const pathWord = route.params.pathWord
    router.push(`/book/${pathWord}/volume/${volumeId}`)
}

// 打开内容
const openContent = (content) => {
    if (content.content_type === 1) {
        // 文本内容，跳转到文本阅读器并定位到指定行
        readTextContent(content)
    } else if (content.content_type === 2) {
        // 插图内容
        currentImage.value = content
        imageModalVisible.value = true
    }
}

// 阅读文本内容
const readTextContent = (content) => {
    if (!volumeDetail.value || !volumeDetail.value.volume.txt_addr) {
        message.error('没有可用的文本地址')
        return
    }

    const { pathWord, volumeId } = route.params
    const txtAddr = volumeDetail.value.volume.txt_addr
    router.push({
        path: `/book/${pathWord}/volume/${volumeId}/reader`,
        query: {
            txtAddr,
            startLine: content.start_lines,
            endLine: content.end_lines
        }
    })
}

// 组件挂载时获取数据
onMounted(async () => {
    await fetchVolumeDetail()
})
</script>

<style scoped src="../assets/styles/book-volume-chapters-view.scss" lang="scss"></style>
