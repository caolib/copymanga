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
                    <div ref="dplayerRef" class="dplayer-container"></div>
                </div>

                <!-- 视频信息 -->
                <div class="video-info" v-if="videoData.name">
                    <a-typography-title :level="3" style="cursor: pointer; color: #1890ff;width: fit-content;"
                        @click="goToCartoonDetail">
                        {{ cartoonData.name }}
                    </a-typography-title>
                    <a-tooltip v-if="videoData.video" title="点击复制">
                        <a-typography-text type="secondary" @click="copyVideoUrl" class="video-url-link">
                            {{ videoData.video }}
                        </a-typography-text>
                    </a-tooltip>
                    <!-- 章节列表 -->
                    <div class="chapters-list" v-if="cartoonPlayerStore.currentCartoonChapters.length">
                        <a-typography-text strong style="margin-bottom: 12px; display: block;">
                            选择集数 ({{ cartoonPlayerStore.currentCartoonChapters.length }}集)：
                        </a-typography-text>
                        <div class="chapters-grid">
                            <a-button v-for="chapter in cartoonPlayerStore.currentCartoonChapters" :key="chapter.uuid"
                                :type="chapter.uuid === route.params.chapterId ? 'primary' : 'default'" size="small"
                                @click="playChapter(chapter)" :title="chapter.name">
                                {{ chapter.name }}
                            </a-button>
                        </div>
                    </div>

                    <!-- 线路选择 -->
                    <div class="line-selector" v-if="videoData.lines">
                        <div class="line-controls">
                            <div class="line-selection">
                                <a-typography-text strong>选择线路：</a-typography-text>
                                <a-radio-group v-model:value="currentLine" @change="onLineChange"
                                    style="margin-left: 12px;">
                                    <a-radio-button v-for="(line, key) in videoData.lines" :key="key" :value="key"
                                        :disabled="!line.config">
                                        {{ line.name }}
                                    </a-radio-button>
                                </a-radio-group>
                            </div>
                            <!-- 本地视频按钮 -->
                            <div class="local-video-section" style="margin-top: 12px;">
                                <a-button v-if="isLocalVideoAvailable" type="primary" :icon="h(FolderOpenOutlined)"
                                    @click="openLocalVideoDirectoryHandler" size="small">
                                    打开本地视频目录
                                </a-button>
                                <a-typography-text v-if="isLocalVideoAvailable" type="secondary"
                                    style="margin-left: 8px; font-size: 12px;">
                                    该视频已在本地下载
                                </a-typography-text>
                            </div>
                        </div>
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
import { ref, onMounted, onUnmounted, nextTick, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { FolderOpenOutlined } from '@ant-design/icons-vue'
import { invoke } from '@tauri-apps/api/core'
import Hls from 'hls.js'
import DPlayer from 'dplayer'
import { getVideoByChapterId, openLocalVideoDirectory, getLocalCartoonChapters } from '../api/cartoon'
import { useCartoonPlayerStore } from '../stores/cartoon-player'

const route = useRoute()
const router = useRouter()
const cartoonPlayerStore = useCartoonPlayerStore()

const dplayerRef = ref(null)
const loading = ref(false)
const error = ref('')
const hls = ref(null)
const dp = ref(null)
const currentLine = ref('')
const playStatus = ref(null)
const isLocalVideoAvailable = ref(false)

const cartoonData = ref({})
const videoData = ref({})

const checkLocalVideo = async (cartoonUuid, chapterId) => {
    try {
        console.log('检查本地视频参数:', { cartoonUuid, chapterId })
        if (cartoonUuid && chapterId) {
            // 使用批量查询检查本地章节
            const localChapters = await getLocalCartoonChapters(cartoonUuid)
            const isDownloaded = localChapters.some(chapter => chapter.chapter_uuid === chapterId)
            console.log('本地视频检查结果:', isDownloaded)

            // 如果没找到，使用调试功能搜索
            if (!isDownloaded) {
                console.log('使用调试功能搜索下载文件...')
                try {
                    const foundPaths = await invoke('debug_find_downloaded_files', { cartoonUuid })
                    console.log('搜索到的下载路径:', foundPaths)
                } catch (debugError) {
                    console.error('调试搜索失败:', debugError)
                }
            }

            return result
        }
        console.log('缺少必要参数进行本地视频检查')
        return false
    } catch (error) {
        console.error('检查本地视频失败:', error)
        return false
    }
}

// 打开本地视频目录
const openLocalVideoDirectoryHandler = async () => {
    try {
        const { chapterId } = route.params
        if (cartoonData.value.uuid && chapterId) {
            await openLocalVideoDirectory(cartoonData.value.uuid, chapterId)
        } else {
            message.error('无法获取动画信息')
        }
    } catch (error) {
        console.error('打开本地视频目录失败:', error)
        message.error('打开本地视频目录失败: ' + error.message)
    }
}

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

    getVideoByChapterId(pathWord, chapterId, selectedLine).then(async response => {
        const results = response.results
        cartoonData.value = results.cartoon || {}
        videoData.value = results.chapter || {}
        currentLine.value = selectedLine

        console.log('获取到的动画数据:', cartoonData.value)
        console.log('动画UUID:', cartoonData.value.uuid)

        // 检查本地视频是否可用
        if (cartoonData.value.uuid && chapterId) {
            console.log('检查本地视频:', cartoonData.value.uuid, chapterId)
            isLocalVideoAvailable.value = await checkLocalVideo(cartoonData.value.uuid, chapterId)
            console.log('本地视频可用:', isLocalVideoAvailable.value)
        } else {
            console.log('缺少必要信息进行本地视频检查:', {
                uuid: cartoonData.value.uuid,
                chapterId: chapterId
            })
        }

        // 初始化视频播放器
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
    if (!dplayerRef.value) {
        error.value = '视频播放器初始化失败'
        return
    }

    if (!videoData.value.video) {
        error.value = '未获取到视频地址'
        return
    }

    // 清理之前的播放器
    if (dp.value) {
        dp.value.destroy()
        dp.value = null
    }
    if (hls.value) {
        hls.value.destroy()
        hls.value = null
    }

    const originalVideoUrl = videoData.value.video
    let videoUrl = originalVideoUrl

    // 使用 DPlayer 配合 HLS.js
    dp.value = new DPlayer({
        container: dplayerRef.value,
        video: {
            url: videoUrl,
            pic: videoData.value.v_cover,
            type: 'customHls',
            customType: {
                customHls: function (video, player) {
                    hls.value = new Hls({
                        enableWorker: true,
                        lowLatencyMode: false,
                        backBufferLength: 90,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 600,
                        maxBufferSize: 60 * 1000 * 1000,
                        maxBufferHole: 0.5,
                        startFragPrefetch: true, testBandwidth: false
                    })
                    hls.value.loadSource(video.src)
                    hls.value.attachMedia(video)

                    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
                        playStatus.value = { text: '准备就绪', color: 'success' }
                        error.value = ''
                        // 给动态生成的 dplayer-container 和 video 元素添加 tauri 拖拽属性
                        nextTick(() => {
                            const dplayerContainer = document.querySelector('.dplayer-container')
                            if (dplayerContainer) {
                                dplayerContainer.setAttribute('data-tauri-drag-region', 'true')
                            }

                            const dplayerVideo = document.querySelector('.dplayer-video')
                            if (dplayerVideo) {
                                dplayerVideo.setAttribute('data-tauri-drag-region', 'true')
                            }
                        })
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
            }
        },
        autoplay: true,
        theme: '#1890ff',
        lang: 'zh-cn',
        screenshot: true,
        hotkey: true,
        preload: 'auto', volume: 0.7,
        mutex: true,
        contextmenu: [
            {
                text: '动画播放器',
                link: '#'
            }
        ]
    })
    // 在播放器初始化完成后添加自定义控制按钮
    dp.value.on('loadedmetadata', () => {
        // 添加向后跳88秒按钮
        const skipButton = document.createElement('div')
        skipButton.className = 'dplayer-icon dplayer-skip-forward-icon'
        skipButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                <path d="M16,18H18V6H16M6,18L14.5,12L6,6V18Z" fill="currentColor"/>
                <text x="12" y="16" font-size="8" fill="currentColor" text-anchor="middle"></text>
            </svg>
        `
        skipButton.title = '向后跳88秒（跳过开头）'
        skipButton.style.cursor = 'pointer'

        // 添加点击事件
        skipButton.addEventListener('click', () => {
            const currentTime = dp.value.video.currentTime
            dp.value.seek(currentTime + 88)
        })

        // 将按钮插入到控制栏
        const controllerBar = document.querySelector('.dplayer-controller .dplayer-icons.dplayer-icons-left')
        if (controllerBar) {
            controllerBar.appendChild(skipButton)
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
    const currentIndex = lines.indexOf(currentLine.value)

    // 找到下一个可用的线路
    for (let i = currentIndex + 1; i < lines.length; i++) {
        const lineKey = lines[i]
        const line = videoData.value.lines[lineKey]
        if (line.config) {
            currentLine.value = lineKey
            fetchVideoData(lineKey)
            return true
        }
    }

    // 重新尝试前面的线路
    for (let i = 0; i < currentIndex; i++) {
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

const retryLoad = () => {
    error.value = ''
    fetchVideoData(currentLine.value)
}

// 复制视频地址到剪贴板
const copyVideoUrl = async () => {
    try {
        await navigator.clipboard.writeText(videoData.value.video)
        message.success('视频地址已复制到剪贴板')
    } catch (error) {
        console.error('复制失败:', error)
        message.error('复制失败，请手动复制')
    }
}

// 播放指定章节
const playChapter = (chapter) => {
    if (!chapter.uuid) {
        message.warning('章节信息异常，无法播放')
        return
    }

    router.push({
        name: 'CartoonPlayer',
        params: {
            pathWord: route.params.pathWord,
            chapterId: chapter.uuid
        },
        query: {
            line: currentLine.value
        }
    })
}

// 跳转到动画详情页面
const goToCartoonDetail = () => {
    if (!route.params.pathWord) {
        message.error('动画信息无效')
        return
    }

    router.push({
        name: 'CartoonDetail',
        params: {
            pathWord: route.params.pathWord
        }
    })
}

onMounted(() => {
    fetchVideoData()
})

onUnmounted(() => {
    if (dp.value) {
        dp.value.destroy()
        dp.value = null
    }
    if (hls.value) {
        hls.value.destroy()
        hls.value = null
    }
})

watch(() => route.params.chapterId, (newChapterId, oldChapterId) => {
    if (newChapterId && newChapterId !== oldChapterId) {
        // 清理之前的播放器
        if (dp.value) {
            dp.value.destroy()
            dp.value = null
        }
        if (hls.value) {
            hls.value.destroy()
            hls.value = null
        }
        // 重新获取数据
        fetchVideoData(route.query.line)
    }
})
</script>

<style scoped src="../assets/styles/cartoon-player.scss" lang="scss"></style>
