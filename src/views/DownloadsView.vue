<template>
  <div class="downloads-container">
    <a-card :bordered="false" class="downloads-card">
      <template #title>
        <div class="downloads-header">
          <h2>下载中心</h2>
          <a-button @click="refreshDownloads" :loading="loading" :icon="h(ReloadOutlined)">
            刷新
          </a-button>
        </div>
      </template>

      <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <a-tab-pane key="tasks" tab="任务列表">
          <div class="task-downloads">
            <a-skeleton :loading="taskLoading" active>
              <div class="task-header">
                <div class="task-stats">
                  <a-statistic title="正在下载" :value="activeTaskCount" suffix="个任务" />
                  <a-statistic title="已暂停" :value="pausedTaskCount" suffix="个任务" />
                </div>
                <div class="task-actions">
                  <a-button @click="pauseAllTasks" :disabled="activeTaskCount === 0">
                    暂停全部
                  </a-button>
                  <a-button @click="resumeAllTasks" :disabled="pausedTaskCount === 0" type="primary">
                    继续全部
                  </a-button>
                </div>
              </div>

              <div v-if="taskList.length === 0 && !taskLoading" class="empty-state">
                <a-empty description="暂无下载任务">
                  <template #image>
                    <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px" />
                  </template>
                </a-empty>
              </div>

              <div v-else class="task-list">
                <a-list :data-source="taskList" item-layout="horizontal">
                  <template #renderItem="{ item }">
                    <a-list-item :key="`${item.id}-${item.status}-${Math.floor(item.progress / 5) * 5}`">
                      <template #actions>
                        <a-button v-if="item.status === 'downloading'" size="small" @click="pauseTask(item)">
                          暂停
                        </a-button>
                        <a-button v-if="item.status === 'paused'" size="small" type="primary" @click="resumeTask(item)">
                          继续
                        </a-button>
                        <a-button v-if="item.status !== 'downloading'" size="small" danger @click="removeTask(item)">
                          删除
                        </a-button>
                      </template>
                      <a-list-item-meta>
                        <template #title>
                          <div class="task-title">
                            <span class="content-name">{{ item.contentName }}</span>
                            <span class="chapter-name">{{ item.chapterName }}</span>
                          </div>
                        </template>
                        <template #description>
                          <div class="task-description">
                            <div class="task-progress">
                              <a-progress :stroke-color="{
                                '0%': '#108ee9',
                                '100%': '#87d068',
                              }" :percent="Number(item.progress.toFixed(2))" :status="getProgressStatus(item.status)"
                                :stroke-width="6" :show-info="true" />
                              <div class="progress-info">
                                <span class="progress-text">{{
                                  item.progressText || '准备下载...'
                                  }}</span>
                                <span class="download-size" v-if="item.downloadedSize">
                                  {{ formatFileSize(item.downloadedSize)
                                  }}{{
                                    item.totalSize ? ' / ' + formatFileSize(item.totalSize) : ''
                                  }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </div>
            </a-skeleton>
          </div>
        </a-tab-pane>

        <a-tab-pane key="manga" tab="漫画">
          <div class="manga-downloads">
            <a-skeleton :loading="loading" active>
              <div v-if="mangaList.length === 0 && !loading" class="empty-state">
                <a-empty description="暂无已下载的漫画">
                  <template #image>
                    <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px" />
                  </template>
                </a-empty>
              </div>
              <div v-else class="manga-grid">
                <a-row :gutter="[16, 16]">
                  <a-col :xs="24" :sm="12" :md="10" :lg="6" :xl="4" v-for="manga in mangaList" :key="manga.uuid">
                    <a-card :hoverable="true" class="manga-card" @click="goToMangaDetail(manga.uuid)">
                      <template #cover>
                        <div class="manga-cover-container">
                          <img :src="manga.coverUrl || '/logo.png'" :alt="manga.name" class="manga-cover"
                            @error="handleImageError" />
                          <div class="manga-overlay">
                            <div class="download-info">
                              <span class="chapter-count"> {{ manga.chapterCount }} 章节 </span>
                            </div>
                          </div>
                        </div>
                      </template>
                      <a-card-meta :title="manga.name">
                        <template #description>
                          <div class="manga-meta">
                            <p v-if="manga.author && manga.author.length" class="manga-author">
                              作者: {{ manga.author.join(', ') }}
                            </p>
                            <p v-if="manga.status" class="manga-status">状态: {{ manga.status }}</p>
                            <p class="download-time">
                              下载时间: {{ formatDate(manga.latestDownloadTime) }}
                            </p>
                          </div>
                        </template>
                      </a-card-meta>
                    </a-card>
                  </a-col>
                </a-row>
              </div>
            </a-skeleton>
          </div>
        </a-tab-pane>

        <a-tab-pane key="cartoon" tab="动画">
          <div class="cartoon-downloads">
            <a-skeleton :loading="cartoonLoading" active>
              <div v-if="cartoonList.length" class="downloads-grid">
                <a-row :gutter="[16, 16]">
                  <a-col v-for="cartoon in cartoonList" :key="cartoon.uuid" :xs="24" :sm="12" :md="10" :lg="6" :xl="4">
                    <a-card class="download-card" hoverable @click="goToCartoonDetail(cartoon.uuid)">
                      <template #cover>
                        <div class="card-cover">
                          <img :src="cartoon.coverUrl || '/logo.png'" :alt="cartoon.name" @error="handleImageError" />
                        </div>
                      </template>
                      <a-card-meta :title="cartoon.name">
                        <template #description>
                          <div class="cartoon-meta">
                            <p v-if="cartoon.company" class="cartoon-company">
                              公司: {{ cartoon.company }}
                            </p>
                            <p v-if="cartoon.cartoon_type" class="cartoon-type">
                              类型: {{ cartoon.cartoon_type }}
                            </p>
                            <p class="download-time">
                              下载时间: {{ formatDate(cartoon.latestDownloadTime) }}
                            </p>
                          </div>
                        </template>
                      </a-card-meta>
                    </a-card>
                  </a-col>
                </a-row>
              </div>
              <a-empty v-else description="暂无已下载的动画">
                <template #image>
                  <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px" />
                </template>
              </a-empty>
            </a-skeleton>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { formatDate } from '../utils/date'
import { formatFileSize } from '../utils/number'
import { getDownloadedMangaList } from '../api/manga'
import { getDownloadedCartoonList } from '../api/cartoon'
import { cartoonDownloadManager } from '../utils/cartoon-download-manager'

const router = useRouter()

// 响应式数据
const activeTab = ref('tasks')
const loading = ref(false)
const mangaList = ref([])
const cartoonLoading = ref(false)
const cartoonList = ref([])

// 任务列表相关数据
const taskLoading = ref(false)
const taskList = ref([])
const taskUpdateInterval = ref(null)

// 任务统计计算属性
const activeTaskCount = computed(
  () => taskList.value.filter((task) => task.status === 'downloading').length,
)
const pausedTaskCount = computed(
  () => taskList.value.filter((task) => task.status === 'paused').length,
)

// 页面生命周期
onMounted(() => {
  // 先初始化下载管理器，然后加载任务列表
  cartoonDownloadManager
    .initialize()
    .then(() => {
      loadTaskList()
      startTaskUpdateTimer()
    })
    .catch((error) => {
      console.error('初始化下载管理器失败:', error)
      // 即使初始化失败，也要加载其他数据
      loadTaskList()
      startTaskUpdateTimer()
    })
  loadDownloadedMangas()
})

// 启动任务更新定时器
const startTaskUpdateTimer = () => {
  // 每秒更新一次任务状态
  taskUpdateInterval.value = setInterval(() => {
    if (activeTab.value === 'tasks' && !taskLoading.value) {
      // 只在不是加载状态时更新，避免频繁重新渲染
      loadTaskList()
    }
  }, 1000) // 改回1秒，确保进度及时更新
}

// 停止任务更新定时器
const stopTaskUpdateTimer = () => {
  if (taskUpdateInterval.value) {
    clearInterval(taskUpdateInterval.value)
    taskUpdateInterval.value = null
  }
}

// 加载任务列表
const loadTaskList = async () => {
  try {
    // 如果已经在加载中，跳过本次更新
    if (taskLoading.value) {
      return
    }

    taskLoading.value = true

    // 获取活跃下载任务和暂停任务
    const activeTasks = await cartoonDownloadManager.getActiveDownloads()
    const pausedTasks = await cartoonDownloadManager.getPausedDownloads()

    // 合并任务列表
    const allTasks = []

    // 处理活跃任务
    activeTasks.forEach((taskInfo, key) => {
      const [cartoonUuid, chapterUuid] = key.split('|')
      const progress = cartoonDownloadManager.getProgress(cartoonUuid, chapterUuid) || 0
      const progressText =
        cartoonDownloadManager.getProgressText(cartoonUuid, chapterUuid) || '下载中...'
      const downloadSizes = cartoonDownloadManager.getDownloadSizes(cartoonUuid, chapterUuid)

      // console.log(`任务 ${taskInfo.chapterName} 进度:`, progress, progressText, downloadSizes) // 添加调试日志

      allTasks.push({
        id: key,
        type: 'cartoon',
        cartoonUuid,
        chapterUuid,
        contentName: taskInfo.cartoonName,
        chapterName: taskInfo.chapterName,
        status: 'downloading',
        progress: progress,
        progressText: progressText,
        downloadedSize: downloadSizes.downloadedSize,
        totalSize: downloadSizes.totalSize,
        startTime: taskInfo.startTime || new Date().toISOString(),
      })
    })

    // 处理暂停任务
    pausedTasks.forEach((taskInfo, key) => {
      const [cartoonUuid, chapterUuid] = key.split('|')
      const downloadSizes = cartoonDownloadManager.getDownloadSizes(cartoonUuid, chapterUuid)

      allTasks.push({
        id: key,
        type: 'cartoon',
        cartoonUuid,
        chapterUuid,
        contentName: taskInfo.cartoonName,
        chapterName: taskInfo.chapterName,
        status: 'paused',
        progress: cartoonDownloadManager.getProgress(cartoonUuid, chapterUuid) || 0,
        progressText: '已暂停',
        downloadedSize: downloadSizes.downloadedSize,
        totalSize: downloadSizes.totalSize,
        startTime: taskInfo.startTime || new Date().toISOString(),
      })
    })

    // 按开始时间排序
    const newTaskList = allTasks.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

    // 只有当任务列表发生实际变化时才更新
    // 使用更精确的比较，避免不必要的重新渲染
    const hasChanged =
      taskList.value.length !== newTaskList.length ||
      taskList.value.some((oldTask, index) => {
        const newTask = newTaskList[index]
        if (!newTask) return true

        return (
          oldTask.id !== newTask.id ||
          oldTask.status !== newTask.status ||
          Math.abs((oldTask.progress || 0) - (newTask.progress || 0)) > 0.5 || // 进度变化超过0.5%就更新
          oldTask.progressText !== newTask.progressText
        )
      })

    if (hasChanged) {
      taskList.value = newTaskList
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
    message.error('加载任务列表失败')
  } finally {
    taskLoading.value = false
  }
}

// 加载已下载的漫画列表
const loadDownloadedMangas = async () => {
  loading.value = true

  await getDownloadedMangaList()
    .then((data) => {
      mangaList.value = data || []
      // console.log('已下载的漫画列表:', mangaList.value)
    })
    .catch((error) => {
      console.error('获取下载列表失败:', error)
      message.error('获取下载列表失败')
      mangaList.value = []
    })
    .finally(() => {
      loading.value = false
    })
}

// 加载已下载的动画列表
const loadDownloadedCartoons = async () => {
  cartoonLoading.value = true

  await getDownloadedCartoonList()
    .then((data) => {
      cartoonList.value = data || []
      // console.log('已下载的动画列表:', JSON.stringify(cartoonList.value, null, 2))
    })
    .catch((error) => {
      console.error('获取动画下载列表失败:', error)
      message.error('获取动画下载列表失败')
      cartoonList.value = []
    })
    .finally(() => {
      cartoonLoading.value = false
    })
}

// 刷新下载列表
const refreshDownloads = () => {
  if (activeTab.value === 'tasks') {
    // 对于任务列表，重置下载管理器状态并重新初始化
    cartoonDownloadManager.resetInitialization()
    cartoonDownloadManager
      .initialize()
      .then(() => {
        loadTaskList()
      })
      .catch((error) => {
        console.error('重新初始化下载管理器失败:', error)
        loadTaskList()
      })
  } else if (activeTab.value === 'manga') {
    loadDownloadedMangas()
  } else if (activeTab.value === 'cartoon') {
    loadDownloadedCartoons()
  }
}

// Tab切换处理
const handleTabChange = (key) => {
  activeTab.value = key
  if (key === 'tasks') {
    loadTaskList()
  } else if (key === 'manga') {
    loadDownloadedMangas()
  } else if (key === 'cartoon') {
    loadDownloadedCartoons()
  }
}

// 跳转到本地漫画详情页
const goToMangaDetail = (uuid) => {
  if (uuid) {
    router.push(`/localmanga/${uuid}`)
  }
}

// 跳转到本地动画详情页
const goToCartoonDetail = (uuid) => {
  if (uuid) {
    router.push(`/localcartoon/${uuid}`)
  }
}

// 图片加载错误处理
const handleImageError = (event) => {
  // 防止循环错误，只在不是默认图片时才切换
  if (event.target.src !== '/logo.png' && !event.target.src.includes('logo.png')) {
    event.target.src = '/logo.png'
  }
}

// 获取进度条状态
const getProgressStatus = (status) => {
  switch (status) {
    case 'downloading':
      return 'active'
    case 'completed':
      return 'success'
    case 'error':
      return 'exception'
    case 'paused':
      return 'normal'
    default:
      return 'normal'
  }
}

// 获取状态文本

// 暂停任务
const pauseTask = async (task) => {
  try {
    await cartoonDownloadManager.pauseDownload(task.cartoonUuid, task.chapterUuid)
    message.success(`任务 "${task.chapterName}" 已暂停`)
    await loadTaskList()
  } catch (error) {
    console.error('暂停任务失败:', error)
    message.error(`暂停任务失败: ${error.message}`)
  }
}

// 继续任务
const resumeTask = async (task) => {
  try {
    await cartoonDownloadManager.resumeDownload(task.cartoonUuid, task.chapterUuid)
    message.success(`任务 "${task.chapterName}" 已继续`)
    await loadTaskList()
  } catch (error) {
    console.error('继续任务失败:', error)
    message.error(`继续任务失败: ${error.message}`)
  }
}

// 删除任务
const removeTask = async (task) => {
  try {
    await cartoonDownloadManager.removeTask(task.cartoonUuid, task.chapterUuid)
    message.success(`任务 "${task.chapterName}" 已删除`)
    await loadTaskList()
  } catch (error) {
    console.error('删除任务失败:', error)
    message.error(`删除任务失败: ${error.message}`)
  }
}

// 暂停全部任务
const pauseAllTasks = async () => {
  try {
    const activeTasks = taskList.value.filter((task) => task.status === 'downloading')
    for (const task of activeTasks) {
      await cartoonDownloadManager.pauseDownload(task.cartoonUuid, task.chapterUuid)
    }
    message.success(`已暂停 ${activeTasks.length} 个任务`)
    await loadTaskList()
  } catch (error) {
    console.error('暂停全部任务失败:', error)
    message.error(`暂停全部任务失败: ${error.message}`)
  }
}

// 继续全部任务
const resumeAllTasks = async () => {
  try {
    const pausedTasks = taskList.value.filter((task) => task.status === 'paused')
    for (const task of pausedTasks) {
      await cartoonDownloadManager.resumeDownload(task.cartoonUuid, task.chapterUuid)
    }
    message.success(`已继续 ${pausedTasks.length} 个任务`)
    await loadTaskList()
  } catch (error) {
    console.error('继续全部任务失败:', error)
    message.error(`继续全部任务失败: ${error.message}`)
  }
}

// 页面卸载清理
onUnmounted(() => {
  stopTaskUpdateTimer()
})
</script>

<style scoped src="../assets/styles/downloads.scss"></style>
