<template>
  <div class="local-cartoon-container">
    <a-card :bordered="false" class="local-cartoon-card">
      <a-skeleton :loading="loading" active avatar>
        <template #skeleton>
          <a-row :gutter="32">
            <a-col :xs="24" :sm="8">
              <a-skeleton-image style="width: 100%; height: 350px; border-radius: 8px" />
            </a-col>
            <a-col :xs="24" :sm="16">
              <a-skeleton-input style="width: 60%; margin-bottom: 16px" size="large" />
              <a-skeleton paragraph active :rows="6" />
            </a-col>
          </a-row>
        </template>

        <a-row :gutter="32">
          <a-col :xs="24" :sm="8">
            <a-image :src="cartoon.cover || '/logo.png'" :alt="cartoon.name" width="100%" height="350px"
              style="border-radius: 8px; object-fit: cover">
            </a-image>
          </a-col>
          <a-col :xs="24" :sm="16">
            <a-typography-title :level="2" :style="{
              cursor: cartoon.path_word ? 'pointer' : 'default',
              color: cartoon.path_word ? '#1890ff' : 'inherit',
            }" @click="goToOnlineDetail">
              {{ cartoon.name || '本地动画' }}
            </a-typography-title>
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="公司" v-if="cartoon.company">
                {{ cartoon.company }}
              </a-descriptions-item>
              <a-descriptions-item label="题材" v-if="cartoon.theme && cartoon.theme.length">
                <a-tag v-for="theme in cartoon.theme" :key="theme" color="blue">{{ theme }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="类型" v-if="cartoon.cartoon_type">
                <a-tag color="green">{{ cartoon.cartoon_type }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="人气" v-if="cartoon.popular">
                {{ formatNumber(cartoon.popular) }}
              </a-descriptions-item>
              <a-descriptions-item label="年份" v-if="cartoon.years">
                {{ cartoon.years }}
              </a-descriptions-item>
              <a-descriptions-item label="已下载章节">
                {{ chapters.length }} 集
              </a-descriptions-item>
              <a-descriptions-item label="最近下载" v-if="cartoon.latestDownloadTime">
                {{ formatDate(cartoon.latestDownloadTime) }}
              </a-descriptions-item>
            </a-descriptions>
            <div style="margin-top: 20px">
              <a-typography-title :level="4">简介</a-typography-title>
              <a-typography-paragraph>{{ cartoon.brief || '暂无简介' }}</a-typography-paragraph>
            </div>
          </a-col>
        </a-row>
      </a-skeleton>

      <a-divider />

      <a-row justify="space-between" align="middle" style="margin-bottom: 12px">
        <a-col>
          <a-space>
            <!-- 排序切换 -->
            <a-button @click="toggleSortOrder" size="small">
              {{ isAscending ? '正序' : '倒序' }}
            </a-button>

            <!-- 刷新按钮 -->
            <a-button @click="loadCartoonData" :loading="chaptersLoading" :icon="h(ReloadOutlined)" size="small">
              刷新
            </a-button>

            <!-- 返回下载中心 -->
            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)" size="small">
              返回下载中心
            </a-button>

            <!-- 批量删除按钮 -->
            <a-popconfirm title="批量删除确认" :description="`此操作将删除 ${chapters.length} 个章节，确定？`" ok-text="确认删除"
              cancel-text="取消" ok-type="danger" @confirm="deleteAllChapters">
              <a-button danger size="small" :icon="h(DeleteOutlined)"> 批量删除 </a-button>
            </a-popconfirm>
          </a-space>
        </a-col>
      </a-row>

      <!-- 章节列表 -->
      <a-skeleton :loading="chaptersLoading" active>
        <div v-if="displayChapters.length === 0 && !chaptersLoading" class="empty-chapters">
          <a-empty description="暂无已下载的章节">
            <template #image>
              <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px" />
            </template>
          </a-empty>
        </div>
        <div v-else class="chapters-grid">
          <a-row :gutter="[12, 12]">
            <a-col :xs="12" :sm="8" :md="6" :lg="4" :xl="3" v-for="chapter in displayChapters"
              :key="chapter.chapter_uuid">
              <a-card size="small" :hoverable="true" class="chapter-card">
                <template #title>
                  <div class="chapter-title" :title="chapter.chapter_name">
                    {{ chapter.chapter_name }}
                  </div>
                </template>
                <div class="chapter-info">
                  <div class="file-size">大小: {{ formatFileSize(chapter.file_size) }}</div>
                  <div class="download-time">下载: {{ formatDate(chapter.download_time) }}</div>
                  <div class="chapter-actions">
                    <a-button type="primary" size="small" @click="openVideoDirectory(chapter)"
                      :icon="h(FolderOpenOutlined)">
                      打开目录
                    </a-button>
                    <a-popconfirm title="确认删除" :description="`确定要删除章节 '${chapter.chapter_name}' 吗？删除后无法恢复。`"
                      ok-text="确认删除" cancel-text="取消" ok-type="danger" @confirm="deleteChapter(chapter)">
                      <a-button size="small" danger :icon="h(DeleteOutlined)"> 删除 </a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-skeleton>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/number'
import {
  getLocalCartoonDetail,
  getLocalCartoonChapters,
  openLocalVideoDirectory,
  deleteCartoonChapter,
  deleteLocalCartoon,
} from '../api/cartoon'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(true)
const chaptersLoading = ref(false)
const cartoon = ref({})
const chapters = ref([])
const isAscending = ref(true)

// 计算属性
const displayChapters = computed(() => {
  const sorted = [...chapters.value]
  if (isAscending.value) {
    return sorted.sort((a, b) =>
      a.chapter_name.localeCompare(b.chapter_name, 'zh-CN', { numeric: true }),
    )
  } else {
    return sorted.sort((a, b) =>
      b.chapter_name.localeCompare(a.chapter_name, 'zh-CN', { numeric: true }),
    )
  }
})

// 页面生命周期
onMounted(() => {
  loadCartoonData()
})

// 加载动画数据
const loadCartoonData = async () => {
  const cartoonUuid = route.params.uuid
  if (!cartoonUuid) {
    message.error('动画ID不能为空')
    return
  }

  loading.value = true
  chaptersLoading.value = true

  try {
    // 并行加载动画详情和章节列表
    const [cartoonDetail, chaptersList] = await Promise.all([
      getLocalCartoonDetail(cartoonUuid),
      getLocalCartoonChapters(cartoonUuid),
    ])

    cartoon.value = cartoonDetail || {}
    chapters.value = chaptersList || []

    // 如果章节列表为空，删除动画详情并返回下载中心
    if (chaptersList.length === 0) {
      message.info('该动画没有已下载的章节，即将删除动画详情并返回下载中心')
      try {
        await deleteLocalCartoon(cartoonUuid)
        message.success('动画删除成功')
      } catch (error) {
        console.error('删除动画详情失败:', error)
        message.error('删除动画详情失败: ' + error.message)
      }
      setTimeout(() => {
        goBack()
      }, 1000)
    }
  } catch (error) {
    console.error('加载本地动画数据失败:', error)
    message.error('加载本地动画数据失败')
  } finally {
    loading.value = false
    chaptersLoading.value = false
  }
}

// 切换排序顺序
const toggleSortOrder = () => {
  isAscending.value = !isAscending.value
}

// 返回下载中心
const goBack = () => {
  router.push('/downloads')
}

// 跳转到在线详情页
const goToOnlineDetail = () => {
  if (cartoon.value.path_word) {
    router.push(`/cartoon/${cartoon.value.path_word}`)
  }
}

// 打开视频目录
const openVideoDirectory = async (chapter) => {
  try {
    await openLocalVideoDirectory(cartoon.value.uuid, chapter.chapter_uuid)
  } catch (error) {
    console.error('打开视频目录失败:', error)
    message.error('打开视频目录失败: ' + error.message)
  }
}

// 删除章节
const deleteChapter = async (chapter) => {
  try {
    await deleteCartoonChapter(cartoon.value.uuid, chapter.chapter_uuid)
    message.success('章节删除成功')

    // 从列表中移除已删除的章节
    chapters.value = chapters.value.filter((c) => c.chapter_uuid !== chapter.chapter_uuid)
  } catch (error) {
    console.error('删除章节失败:', error)
    message.error('删除章节失败: ' + error.message)
  }
}

// 批量删除所有章节（修改为直接删除动画文件夹）
const deleteAllChapters = async () => {
  try {
    chaptersLoading.value = true
    message.loading('正在删除动画，请稍候...', 0)

    // 直接删除动画本身
    await deleteLocalCartoon(cartoon.value.uuid)

    message.destroy() // 关闭loading消息
    message.success('动画删除成功')

    // 延迟返回下载中心
    setTimeout(() => {
      goBack()
    }, 500)
  } catch (error) {
    message.destroy() // 关闭loading消息
    console.error('删除动画失败:', error)
    message.error('删除动画失败: ' + error.message)

    // 重新加载章节列表，查看还有哪些章节
    await loadCartoonData()
  } finally {
    chaptersLoading.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知'

  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped src="../assets/styles/local-cartoon-detail.scss" lang="scss"></style>
