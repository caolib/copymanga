<template>
  <div class="local-manga-container">
    <!-- 错误状态显示 -->
    <div v-if="errorState" class="error-container">
      <a-result status="error" :title="errorState.title" :sub-title="errorState.message">
        <template #extra>
          <a-space>
            <a-button @click="loadMangaData" :loading="loading" type="primary"> 重新加载 </a-button>
            <a-button @click="goBack"> 返回下载中心 </a-button>
          </a-space>
        </template>
      </a-result>
    </div>

    <!-- 正常内容显示 -->
    <a-card v-else :bordered="false" class="local-manga-card">
      <a-skeleton :loading="loading" active avatar>
        <template #skeleton>
          <a-row :gutter="32">
            <a-col :xs="24" :sm="8">
              <a-skeleton-image style="width: 100%; height: 350px; border-radius: 8px" />
            </a-col>
            <a-col :xs="24" :sm="16">
              <a-skeleton-input style="width: 60%; margin-bottom: 16px" size="large" />
              <a-skeleton paragraph active :rows="6" />
              <div style="margin: 24px 0">
                <a-skeleton-button size="large" style="margin-right: 10px" />
                <a-skeleton-button size="large" style="margin-right: 10px" />
                <a-skeleton-button size="large" />
              </div>
              <a-skeleton-input style="width: 20%; margin-bottom: 12px" />
              <a-skeleton paragraph :rows="3" />
            </a-col>
          </a-row>
        </template>

        <a-row :gutter="32">
          <a-col :xs="24" :sm="8">
            <a-image
              :src="manga.coverUrl || '/logo.png'"
              :alt="manga.name"
              width="100%"
              height="350px"
              style="border-radius: 8px; object-fit: cover"
              :placeholder="true"
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <a-spin size="large" />
                  <div style="margin-top: 12px; color: #666">加载中...</div>
                </div>
              </template>
              <template #error>
                <div class="image-error">
                  <div class="error-icon">📖</div>
                  <div class="error-text">暂无封面</div>
                </div>
              </template>
            </a-image>
          </a-col>
          <a-col :xs="24" :sm="16">
            <a-typography-title
              :level="2"
              :style="{
                cursor: manga.path_word ? 'pointer' : 'default',
                color: manga.path_word ? '#1890ff' : 'inherit',
              }"
              @click="goToOnlineDetail"
            >
              {{ manga.name || '本地漫画' }}
            </a-typography-title>
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="作者" v-if="manga.author && manga.author.length">
                <a-tag v-for="(author, index) in manga.author" :key="index" class="author-tag">
                  {{ author }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="题材" v-if="manga.theme && manga.theme.length">
                <a-tag v-for="theme in manga.theme" :key="theme" color="blue">{{ theme }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="状态" v-if="manga.status">
                <a-tag color="green">{{ manga.status }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="人气" v-if="manga.popular">
                {{ formatNumber(manga.popular) }}
              </a-descriptions-item>
              <a-descriptions-item label="已下载章节">
                {{ chapters.length }} 章
              </a-descriptions-item>
              <a-descriptions-item label="最近下载" v-if="manga.latestDownloadTime">
                {{ formatDate(manga.latestDownloadTime) }}
              </a-descriptions-item>
            </a-descriptions>
            <div style="margin-top: 20px">
              <a-typography-title :level="4">简介</a-typography-title>
              <a-typography-paragraph>{{ manga.brief || '暂无简介' }}</a-typography-paragraph>
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
            <a-button
              @click="loadMangaData"
              :loading="chaptersLoading"
              :icon="h(ReloadOutlined)"
              size="small"
            >
              刷新
            </a-button>

            <!-- 返回下载中心 -->
            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)" size="small">
              返回下载中心
            </a-button>

            <!-- 批量删除按钮 -->
            <a-popconfirm
              title="批量删除确认"
              :description="`此操作将删除所有章节，确定？`"
              ok-text="确认删除"
              cancel-text="取消"
              ok-type="danger"
              @confirm="deleteAllChapters"
              v-if="chapters.length > 0"
            >
              <a-button danger size="small" :icon="h(DeleteOutlined)"> 批量删除 </a-button>
            </a-popconfirm>
          </a-space>
        </a-col>
      </a-row>

      <!-- 分组 Tab 菜单 -->
      <a-tabs
        v-if="groupOptions.length > 1"
        v-model:activeKey="selectedGroup"
        @change="handleGroupChange"
        style="margin-bottom: 16px"
      >
        <a-tab-pane v-for="group in groupOptions" :key="group.value" :tab="group.label">
        </a-tab-pane>
      </a-tabs>

      <!-- 章节列表 -->
      <a-skeleton :loading="chaptersLoading" active>
        <div v-if="currentGroupChapters.length === 0 && !chaptersLoading" class="empty-chapters">
          <a-empty description="暂无已下载的章节">
            <template #image>
              <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px" />
            </template>
          </a-empty>
        </div>
        <a-row v-else :gutter="[12, 12]">
          <a-col
            :xs="12"
            :sm="8"
            :md="6"
            :lg="4"
            :xl="3"
            v-for="chapter in currentGroupChapters"
            :key="chapter.chapter_uuid || chapter.uuid"
          >
            <a-card
              :hoverable="true"
              style="text-align: center; padding: 0"
              size="small"
              :body-style="{ padding: '12px 6px' }"
              class="chapter-card"
            >
              <!-- 章节名称 -->
              <div style="cursor: pointer; margin-bottom: 8px" @click="readChapter(chapter)">
                <span style="font-size: 14px">{{
                  chapter.chapter_name || chapter.name || '未知章节'
                }}</span>
              </div>

              <!-- 章节信息 -->
              <div
                class="chapter-info"
                @click="readChapter(chapter)"
                style="cursor: pointer; margin-bottom: 8px"
              >
                <p class="download-time" style="margin: 4px 0; font-size: 12px; color: #999">
                  {{ formatDate(chapter.download_time || chapter.downloadTime) }}
                </p>
                <p class="image-count" style="margin: 4px 0; font-size: 12px; color: #666">
                  {{ chapter.imageCount }} 页
                </p>
              </div>

              <!-- 操作按钮 -->
              <div class="chapter-actions" style="display: flex; justify-content: center; gap: 4px">
                <a-button
                  size="small"
                  danger
                  @click.stop="deleteChapter(chapter)"
                  :title="'删除章节'"
                  :icon="h(DeleteOutlined)"
                >
                </a-button>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-skeleton>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/number'
import { getLocalMangaDetail, getLocalMangaChapters, deleteLocalManga } from '../api/manga'
import { downloadManager } from '../utils/download-manager'

const router = useRouter()
const route = useRoute()

// 响应式数据
const loading = ref(false)
const chaptersLoading = ref(false)
const manga = ref({})
const chapters = ref([])
const isAscending = ref(false)
const selectedGroup = ref('default')
const errorState = ref(null)

// 计算属性
computed(() => {
  const sorted = [...chapters.value]
  return isAscending.value ? sorted : sorted.reverse()
})

// 按分组组织章节
const chapterGroups = computed(() => {
  const groups = {}
  chapters.value.forEach((chapter) => {
    const group = chapter.group_path_word || chapter.group || 'default'
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(chapter)
  })

  return groups
})

// 当前选中分组的章节
const currentGroupChapters = computed(() => {
  const groupChapters = chapterGroups.value[selectedGroup.value] || []
  // 对当前分组的章节进行排序
  const sorted = [...groupChapters]
  return isAscending.value
    ? sorted.sort((a, b) =>
        (a.download_time || a.downloadTime || '').localeCompare(
          b.download_time || b.downloadTime || '',
        ),
      )
    : sorted.sort((a, b) =>
        (b.download_time || b.downloadTime || '').localeCompare(
          a.download_time || a.downloadTime || '',
        ),
      )
})

// 分组选项
const groupOptions = computed(() => {
  return Object.keys(chapterGroups.value).map((group) => ({
    label: group === 'default' ? '默认' : group,
    value: group,
  }))
})

// 页面生命周期
onMounted(() => {
  loadMangaData()
})

// 加载漫画数据
const loadMangaData = async () => {
  const mangaUuid = route.params.uuid

  if (!mangaUuid) {
    errorState.value = {
      title: '参数错误',
      message: '漫画UUID无效，无法加载漫画信息',
    }
    return
  }

  loading.value = true
  errorState.value = null

  // 加载漫画详情
  await getLocalMangaDetail(mangaUuid)
    .then((data) => {
      if (data && typeof data === 'object') {
        manga.value = data
      } else {
        errorState.value = {
          title: '未找到本地漫画信息',
          message: `漫画 UUID: ${mangaUuid}\n\n可能的原因：\n• 漫画未下载或下载不完整\n• 漫画详情文件 manga_detail.json 丢失\n• UUID参数错误\n• 下载目录结构异常\n\n请检查下载中心是否有此漫画的下载记录`,
        }
      }
    })
    .catch((error) => {
      errorState.value = {
        title: '加载失败',
        message: `获取本地漫画详情失败: ${error.message || '未知错误'}\n\n技术详情：${error}\n\n请检查：\n• 应用权限是否正常\n• 下载目录是否存在\n• 漫画文件是否完整`,
      }
    })
    .finally(() => {
      loading.value = false
    })

  // 只有在成功获取到漫画信息时才加载章节
  await loadChapters(mangaUuid)
}

// 加载章节列表
const loadChapters = async (mangaUuid) => {
  chaptersLoading.value = true

  await getLocalMangaChapters(mangaUuid)
    .then((data) => {
      chapters.value = data || []

      // 设置默认选中的分组
      if (chapters.value.length > 0) {
        const availableGroups = [
          ...new Set(
            chapters.value.map((chapter) => chapter.group_path_word || chapter.group || 'default'),
          ),
        ]
        selectedGroup.value = availableGroups.includes('default') ? 'default' : availableGroups[0]
      } else {
        // 如果章节列表为空，删除漫画详情并返回下载中心
        message.info('该漫画没有已下载的章节，即将删除漫画详情并返回下载中心')
        try {
          deleteLocalManga(mangaUuid)
            .then(() => {
              message.success('漫画删除成功')
              setTimeout(() => {
                goBack()
              }, 1000)
            })
            .catch((error) => {
              console.error('删除漫画详情失败:', error)
              message.error('删除漫画详情失败: ' + error.message)
              setTimeout(() => {
                goBack()
              }, 1000)
            })
        } catch (error) {
          console.error('删除漫画失败:', error)
          message.error('删除漫画失败: ' + error.message)
          setTimeout(() => {
            goBack()
          }, 1000)
        }
      }
    })
    .catch((error) => {
      console.error('获取本地章节列表失败:', error)
      message.error(`获取本地章节列表失败: ${error.message || '未知错误'}`)
      chapters.value = []
    })
    .finally(() => {
      chaptersLoading.value = false
    })
}

// 切换排序
const toggleSortOrder = () => {
  isAscending.value = !isAscending.value
}

// 分组切换处理
const handleGroupChange = (key) => {
  selectedGroup.value = key
}

// 阅读章节
const readChapter = (chapter) => {
  // 跳转到章节阅读页面，传递漫画UUID参数表示这是本地章节
  router.push({
    path: `/manga/${manga.value.pathWord || manga.value.path_word || 'local'}/chapter/${chapter.chapter_uuid || chapter.uuid}`,
    query: {
      mangaUuid: manga.value.uuid,
      local: 'true', // 标识这是本地章节
    },
  })
}

// 删除章节
const deleteChapter = async (chapter) => {
  const groupPathWord = chapter.group_path_word || chapter.group || 'default'

  await downloadManager
    .deleteChapter(manga.value.uuid, groupPathWord, chapter.chapter_uuid || chapter.uuid)
    .then(() => {
      message.success(`章节 "${chapter.chapter_name || chapter.name}" 删除成功`)
      // 重新加载章节列表
      loadChapters(manga.value.uuid)
    })
    .catch((error) => {
      console.error('删除章节失败:', error)
      message.error(`删除失败: ${error.message || '未知错误'}`)
    })
}

// 批量删除所有章节（修改为直接删除漫画文件夹）
const deleteAllChapters = async () => {
  if (chapters.value.length === 0) {
    message.info('没有可删除的章节')
    return
  }

  try {
    chaptersLoading.value = true
    message.loading('正在删除漫画，请稍候...', 0)

    // 直接删除整个漫画文件夹
    await deleteLocalManga(manga.value.uuid)

    message.destroy() // 关闭loading消息
    message.success('漫画删除成功')

    // 延迟返回下载中心
    setTimeout(() => {
      goBack()
    }, 500)
  } catch (error) {
    message.destroy() // 关闭loading消息
    console.error('删除漫画失败:', error)
    message.error('删除漫画失败: ' + error.message)

    // 重新加载章节列表，查看还有哪些章节
    await loadChapters(manga.value.uuid)
  } finally {
    chaptersLoading.value = false
  }
}

// 返回下载中心
const goBack = () => {
  router.push('/downloads')
}

// 跳转到在线漫画详情页
const goToOnlineDetail = () => {
  if (manga.value.path_word) {
    // 直接跳转到在线漫画详情页
    router.push(`/manga/${manga.value.path_word}`)
  } else {
    message.warning('该漫画没有在线链接信息')
  }
}
</script>

<style scoped src="../assets/styles/local-manga-detail.scss"></style>
