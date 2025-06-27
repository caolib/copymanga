<template>
  <div class="ranking-list">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <a-skeleton active :paragraph="{ rows: 8 }" />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <a-result status="error" :title="error">
        <template #extra>
          <a-button type="primary" @click="$emit('refresh')">重试</a-button>
        </template>
      </a-result>
    </div>

    <!-- 内容区域 -->
    <div v-else class="ranking-content">
      <!-- 排行榜列表 -->
      <div v-if="data.length > 0" class="ranking-posts">
        <a-row :gutter="[16, 16]">
          <a-col
            v-for="(item, index) in data"
            :key="item.post?.uuid || index"
            :xs="12"
            :sm="8"
            :md="6"
            :lg="4"
            :xl="4"
            :xxl="4"
          >
            <a-card hoverable class="ranking-card" @click="goToPostDetail(item.post.uuid)">
              <template #cover>
                <div class="ranking-cover">
                  <img :src="item.post.cover" :alt="item.post.name" @error="handleImageError" />
                  <!-- 排名徽章 -->
                  <div class="ranking-badge" :class="getRankingBadgeClass(item.sort)">
                    {{ item.sort }}
                  </div>
                  <!-- 人气变化 -->
                  <div
                    v-if="item.rise_num !== undefined"
                    class="popularity-change"
                    :class="getPopularityChangeClass(item.rise_num)"
                  >
                    <span v-if="item.rise_num > 0">+{{ item.rise_num }}</span>
                    <span v-else-if="item.rise_num < 0">{{ item.rise_num }}</span>
                  </div>
                </div>
              </template>
              <a-card-meta>
                <template #title>
                  <div class="post-title" :title="item.post.name">
                    {{ item.post.name }}
                  </div>
                </template>
                <template #description>
                  <div class="post-info">
                    <div class="post-popular">人气: {{ formatNumber(item.popular) }}</div>
                    <div v-if="item.sort_last" class="last-rank">
                      上期: 第{{ item.sort_last }}名
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
        <a-empty description="暂无排行榜数据">
          <a-button type="primary" @click="$emit('refresh')">刷新</a-button>
        </a-empty>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination-container">
        <a-pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="total"
          :show-size-changer="true"
          :page-size-options="['18', '36', '54']"
          :show-quick-jumper="true"
          :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`"
          @change="(page, size) => $emit('page-change', page, size || pageSize)"
          @showSizeChange="(current, size) => $emit('page-change', 1, size)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { goToPostDetail } from '@/router/post-router'
import { formatNumber } from '@/utils/number'

// 定义 props
defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 18,
  },
})
// 定义 emits
const emit = defineEmits(['page-change', 'refresh'])

// 获取排名徽章样式类
const getRankingBadgeClass = (rank) => {
  if (rank <= 3) {
    return `rank-${rank}`
  }
  return 'rank-normal'
}

// 获取人气变化样式类
const getPopularityChangeClass = (riseNum) => {
  if (riseNum > 0) {
    return 'rise-positive'
  } else if (riseNum < 0) {
    return 'rise-negative'
  }
  return 'rise-neutral'
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = '/logo.png'
}
</script>

<style scoped src="../../assets/styles/ranking-list.scss" lang="scss"></style>
