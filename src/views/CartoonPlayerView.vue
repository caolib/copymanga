<template>
    <div class="cartoon-player-container">
        <a-card :bordered="false" class="player-card">
            <a-skeleton :loading="loading" active>
                <template #skeleton>
                    <div class="skeleton-video">
                        <a-skeleton-image style="width: 100%; height: 500px;" />
                    </div>
                    <div style="margin-top: 16px;">
                        <a-skeleton-input style="width: 40%; margin-bottom: 8px;" size="large" />
                        <a-skeleton paragraph :rows="2" />
                    </div>
                </template> <!-- 视频播放器 -->
                <div class="video-container" v-if="!loading">
                    <video ref="videoElement" controls :poster="videoData.v_cover" class="video-player"
                        @loadstart="onVideoLoadStart" @canplay="onVideoCanPlay" @error="onVideoError">
                        您的浏览器不支持视频播放
                    </video>
                </div>

                <!-- 视频信息 -->
                <div class="video-info" v-if="videoData.name">
                    <a-typography-title :level="3">{{ cartoonData.name }}</a-typography-title>
                    <a-typography-title :level="4" type="secondary">{{ videoData.name }}</a-typography-title>

                    <!-- 线路选择 -->
                    <div class="line-selector" v-if="videoData.lines">
                        <a-typography-text strong>选择线路：</a-typography-text>
                        <a-radio-group v-model:value="currentLine" @change="onLineChange" style="margin-left: 12px;">
                            <a-radio-button v-for="(line, key) in videoData.lines" :key="key" :value="key"
                                :disabled="!line.config">
                                {{ line.name }}
                            </a-radio-button>
                        </a-radio-group>
                    </div>

                </div><!-- 错误提示 -->
                <a-result v-if="error" status="error" :title="error" sub-title="请尝试切换其他线路或稍后重试">
                    <template #extra>
                        <a-space>
                            <a-button type="primary" @click="retryLoad">重新加载</a-button>
                            <a-button @click="tryNextLine" v-if="videoData.lines">尝试其他线路</a-button>
                        </a-space>
                    </template>
                </a-result>
            </a-skeleton>
        </a-card>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import Hls from 'hls.js'
import { getVideoByChapterId } from '../api/cartoon'

const route = useRoute()
const router = useRouter()

const videoElement = ref(null)
const loading = ref(false)
const error = ref('')
const hls = ref(null)
const currentLine = ref('')
const playStatus = ref(null)

const cartoonData = ref({})
const videoData = ref({})

const fetchVideoData = (line) => {
    const { pathWord, chapterId } = route.params
    const selectedLine = line || route.query.line || 'line3'

    if (!pathWord || !chapterId) {
        error.value = '参数错误'
        return
    }

    loading.value = true
    error.value = ''
    playStatus.value = { text: '加载中...', color: 'processing' }

    getVideoByChapterId(pathWord, chapterId, selectedLine).then(response => {
        const results = response.results
        cartoonData.value = results.cartoon || {}
        videoData.value = results.chapter || {}
        currentLine.value = selectedLine        // 初始化视频播放器
        nextTick(() => {
            setTimeout(() => {
                initializePlayer()
            }, 100)
        })
    }).catch(err => {
        console.error('获取视频数据失败:', err)
        error.value = err.message || '获取视频数据失败'
        playStatus.value = { text: '加载失败', color: 'error' }
        message.error(error.value)
    }).finally(() => {
        loading.value = false
    })
}

const initializePlayer = async () => {
    if (!videoElement.value) {
        error.value = '视频播放器初始化失败'
        return
    }

    if (!videoData.value.video) {
        error.value = '未获取到视频地址'
        return
    }

    // 清理之前的播放器
    if (hls.value) {
        hls.value.destroy()
        hls.value = null
    } const originalVideoUrl = videoData.value.video
    let videoUrl = originalVideoUrl

    // 直接使用HLS.js播放，无需检查浏览器支持
    hls.value = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        startFragPrefetch: true,
        testBandwidth: false
    })

    hls.value.loadSource(videoUrl)
    hls.value.attachMedia(videoElement.value)

    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        playStatus.value = { text: '准备就绪', color: 'success' }
        error.value = ''
    })

    hls.value.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    if (!tryNextLine()) {
                        error.value = '网络错误，所有线路都无法访问'
                        playStatus.value = { text: '播放失败', color: 'error' }
                    }
                    break
                case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.value.recoverMediaError()
                    break
                default:
                    error.value = '播放器错误'
                    playStatus.value = { text: '播放错误', color: 'error' }
                    break
            }
        }
    })
}

const onLineChange = (e) => {
    const newLine = e.target.value

    // 更新URL参数
    router.replace({
        ...route,
        query: {
            ...route.query,
            line: newLine
        }
    })

    // 重新加载视频
    fetchVideoData(newLine)
}

// 自动尝试其他线路
const tryNextLine = () => {
    if (!videoData.value.lines) return false

    const lines = Object.keys(videoData.value.lines)
    const currentIndex = lines.indexOf(currentLine.value)    // 找到下一个可用的线路
    for (let i = currentIndex + 1; i < lines.length; i++) {
        const lineKey = lines[i]
        const line = videoData.value.lines[lineKey]
        if (line.config) {
            currentLine.value = lineKey
            fetchVideoData(lineKey)
            return true
        }
    } for (let i = 0; i < currentIndex; i++) {
        const lineKey = lines[i]
        const line = videoData.value.lines[lineKey]
        if (line.config) {
            currentLine.value = lineKey
            fetchVideoData(lineKey)
            return true
        }
    }

    return false
}

const onVideoLoadStart = () => {
    playStatus.value = { text: '加载中...', color: 'processing' }
}

const onVideoCanPlay = () => {
    playStatus.value = { text: '可以播放', color: 'success' }
}

const onVideoError = (e) => {
    error.value = '视频播放失败'
    playStatus.value = { text: '播放失败', color: 'error' }
}

const retryLoad = () => {
    error.value = ''
    fetchVideoData(currentLine.value)
}

onMounted(() => {
    fetchVideoData()
})

onUnmounted(() => {
    if (hls.value) {
        hls.value.destroy()
        hls.value = null
    }
})
</script>

<style scoped src="../assets/styles/cartoon-player.scss" lang="scss"></style>
