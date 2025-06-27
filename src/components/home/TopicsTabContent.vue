<template>
  <div class="topics-tab">
    <div class="topics-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <a-skeleton active :paragraph="{ rows: 8 }" />
      </div>

      <!-- 专题列表 -->
      <div v-else-if="topicsList.length > 0" class="topics-grid">
        <a-row :gutter="[24, 24]">
          <a-col
            v-for="topic in topicsList"
            :key="topic.path_word"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <a-card hoverable class="topic-card" @click="goToTopicDetail(topic.path_word)">
              <template #cover v-if="topic.cover">
                <div class="topic-cover">
                  <img :src="topic.cover" :alt="topic.title" />
                  <div class="topic-overlay">
                    <div class="topic-meta">
                      <a-tag v-if="topic.series" :color="topic.series.color || 'blue'" size="small">
                        {{ topic.series.name }}
                      </a-tag>
                      <span v-if="topic.period" class="topic-period">{{ topic.period }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <a-card-meta>
                <template #title>
                  <div class="topic-title" :title="topic.title">
                    {{ topic.title }}
                  </div>
                </template>
                <template #description>
                  <div class="topic-info">
                    <div v-if="topic.brief" class="topic-brief">
                      {{ topic.brief }}
                    </div>
                    <div class="topic-date" v-if="topic.datetime_created">
                      {{ formatDate(topic.datetime_created) }}
                    </div>
                  </div>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-container">
        <a-empty description="暂无专题数据">
          <template #image>
            <div class="empty-icon">📚</div>
          </template>
        </a-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from '@/stores/home.js'

const router = useRouter()
const homeStore = useHomeStore()

const loading = ref(false)

// 从主页store中获取专题数据
const topicsList = computed(() => {
  const homeData = homeStore.homeData
  // 合并 topics 和 topicsList 的数据
  const topics = homeData.topics?.list || []
  const topicsList = homeData.topicsList?.list || []

  // 合并去重
  const allTopics = [...topics, ...topicsList]
  return allTopics.filter(
    (topic, index, self) => index === self.findIndex((t) => t.path_word === topic.path_word),
  )
})

// 跳转到专题详情页
const goToTopicDetail = (pathWord) => {
  router.push({
    name: 'TopicDetail',
    params: { pathWord },
  })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (error) {
    return dateStr
  }
}

// 初始化数据
onMounted(() => {
  // 在组件挂载时不主动加载数据，依赖HomeView的tab切换逻辑加载
  loading.value = homeStore.isLoading
})
</script>

<style scoped>
@import '../../assets/styles/topics-tab.scss';
</style>
