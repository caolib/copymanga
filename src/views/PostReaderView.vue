<template>
  <div class="post-reader-view">
    <div class="post-reader-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <a-skeleton active :paragraph="{ rows: 8 }" />
      </div>

      <!-- 写真阅读器 -->
      <div v-else-if="chapterData" class="post-reader">
        <!-- 顶部导航 -->
        <div class="reader-header">
          <div class="header-left">
            <a-button @click="goBack" :icon="h(ArrowLeftOutlined)" size="small">
              返回详情
            </a-button>
            <span class="post-title">{{ chapterData.post?.name }}</span>
          </div>
          <div class="header-center">
            <span class="chapter-name">{{ chapterData.chapter?.name }}</span>
          </div>
          <div class="header-right">
            <a-button v-if="chapterData.chapter?.prev" @click="gotoPrevChapter" size="small">
              上一章
            </a-button>
            <a-button v-if="chapterData.chapter?.next" @click="gotoNextChapter" size="small">
              下一章
            </a-button>
          </div>
        </div>
        <!-- 图片阅读区域 -->
        <div class="reader-content">
          <div v-if="images.length > 0" class="images-container">
            <div v-for="(image, index) in images" :key="index" class="image-item">
              <a-image
                :src="image.url"
                :alt="`第${index + 1}张`"
                :preview="{ visible: false }"
                @click="openPreview(index)"
              />
            </div>

            <!-- 相册预览组 -->
            <div style="display: none">
              <a-image-preview-group
                :preview="{
                  visible: previewVisible,
                  current: currentPreviewIndex,
                }"
              >
                <a-image v-for="(image, index) in images" :key="index" :src="image.url" />
              </a-image-preview-group>
            </div>
          </div>
          <div v-else class="no-images">
            <a-empty description="暂无图片" />
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="error-container">
        <a-result status="error" title="加载写真失败">
          <template #extra>
            <a-button type="primary" @click="fetchChapterData">重新加载</a-button>
            <a-button @click="goBack">返回详情</a-button>
          </template>
        </a-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostImg } from '../api/post'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const chapterData = ref(null)
const previewVisible = ref(false)
const currentPreviewIndex = ref(0)

const images = computed(() => chapterData.value?.chapter?.contents || [])

// 获取章节数据
const fetchChapterData = async () => {
  const postId = route.params.postId
  const chapterId = route.params.chapterId
  if (!postId || !chapterId) return

  loading.value = true

  await getPostImg(postId, chapterId)
    .then((response) => {
      if (response.results) {
        chapterData.value = response.results
      }
    })
    .catch((err) => {
      console.error('获取写真图片失败:', err)
      message.error('获取写真图片失败')
    })
    .finally(() => {
      loading.value = false
    })
}

// 打开预览
const openPreview = (index) => {
  currentPreviewIndex.value = index
  previewVisible.value = true
}

// 跳转到上一章
const gotoPrevChapter = () => {
  if (chapterData.value?.chapter?.prev) {
    router.push({
      name: 'PostReader',
      params: {
        postId: route.params.postId,
        chapterId: chapterData.value.chapter.prev,
      },
    })
  }
}

// 跳转到下一章
const gotoNextChapter = () => {
  if (chapterData.value?.chapter?.next) {
    router.push({
      name: 'PostReader',
      params: {
        postId: route.params.postId,
        chapterId: chapterData.value.chapter.next,
      },
    })
  }
}

// 键盘事件处理
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    goBack()
  }
}

// 返回详情页
const goBack = () => {
  router.push({
    name: 'PostDetail',
    params: { postId: route.params.postId },
  })
}

// 组件挂载时获取数据和绑定事件
onMounted(() => {
  fetchChapterData()
  document.addEventListener('keydown', handleKeydown)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped src="../assets/styles/post-reader.scss" lang="scss"></style>
