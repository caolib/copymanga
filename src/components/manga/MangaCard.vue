<template>
  <!-- 排行榜项目显示模式 -->
  <div v-if="displayType === 'rank-item'" class="rank-item" @click="handleClick">
    <div class="rank-number" :class="`rank-${ranking}`">{{ ranking }}</div>
    <img :src="displayCoverUrl" :alt="displayManga.name" class="rank-cover" @error="handleImageError" />
    <div class="rank-info">
      <div class="rank-title">{{ displayManga.name }}</div>
      <div class="rank-popular">{{ formatNumber ? formatNumber(displayManga.popular) : displayManga.popular }}</div>
    </div>
  </div>

  <!-- 卡片显示模式 -->
  <a-card v-else :hoverable="hoverable" :class="[cardClass, { 'natural-size': naturalSize }]" @click="handleClick">
    <!-- 封面区域 -->
    <template v-if="useCardCover" #cover>
      <div class="manga-cover-container">
        <img :src="displayCoverUrl" :alt="displayManga.name" class="manga-cover" @error="handleImageError" />

        <!-- 排名标签 -->
        <div v-if="ranking" class="ranking-badge" :class="getRankingClass(ranking)">
          {{ ranking }}
        </div>

        <!-- 热度标签 -->
        <div v-if="displayManga.popular" class="popular-badge">
          {{ formatNumber ? formatNumber(displayManga.popular) : displayManga.popular }}
        </div>

        <!-- 趋势标签（排名变化） - 固定在右上角 -->
        <div v-if="trend && trend !== 'same'" class="trend-badge" :class="`trend-${trend}`">
          <span v-if="trend === 'up'">↑{{ Math.abs(trendValue) }}</span>
          <span v-else-if="trend === 'down'">↓{{ Math.abs(trendValue) }}</span>
        </div>

        <div v-if="showOverlay" class="manga-overlay">
          <div class="download-info" v-if="overlayText">
            <span class="chapter-count">{{ overlayText }}</span>
          </div>
        </div>
        <!-- 状态标签 -->
        <div v-if="showStatus" class="manga-status" :class="{ completed: displayManga.status === 1 }">
          {{ displayManga.status === 1 ? '已完结' : '连载中' }}
        </div>
        <!-- 更新徽章 -->
        <a-badge v-if="showUpdateBadge" count="有更新" :style="badgeStyle" />
      </div>
    </template>

    <!-- 内容区域 -->
    <div v-if="!useCardCover" class="manga-cover">
      <img :src="displayCoverUrl" :alt="displayManga.name" class="manga-cover" @error="handleImageError" />

      <!-- 排名标签 -->
      <div v-if="ranking" class="ranking-badge" :class="getRankingClass(ranking)">
        {{ ranking }}
      </div>

      <!-- 热度标签 -->
      <div v-if="displayManga.popular" class="popular-badge">
        {{ formatNumber ? formatNumber(displayManga.popular) : displayManga.popular }}
      </div>

      <!-- 趋势标签（排名变化） - 固定在右上角 -->
      <div v-if="trend && trend !== 'same'" class="trend-badge" :class="`trend-${trend}`">
        <span v-if="trend === 'up'">↑{{ Math.abs(trendValue) }}</span>
        <span v-else-if="trend === 'down'">↓{{ Math.abs(trendValue) }}</span>
      </div>

      <!-- 状态标签 -->
      <div v-if="showStatus" class="manga-status" :class="{ completed: displayManga.status === 1 }">
        {{ displayManga.status === 1 ? '已完结' : '连载中' }}
      </div>
      <!-- 更新徽章 -->
      <a-badge v-if="showUpdateBadge" count="有更新" :style="badgeStyle" />
    </div>

    <!-- 漫画信息 - 统一显示格式 -->
    <div :class="infoClass">
      <h3 class="manga-title">{{ displayManga.name }}</h3>

      <!-- 统一的漫画信息显示 -->
      <div class="manga-info-unified">
        <!-- 作者信息 -->
        <div v-if="displayAuthorText" class="manga-author">
          {{ displayAuthorText }}
        </div>

        <!-- 更新时间 -->
        <div v-if="displayManga.datetime_updated" class="manga-date">
          上次更新：{{ formatDate ? formatDate(displayManga.datetime_updated) : displayManga.datetime_updated }}
        </div>

        <!-- 浏览记录特有信息 -->
        <div v-if="browsingLastChapter" class="last-chapter">
          上次看到：{{ browsingLastChapter }}
        </div>

        <!-- 自定义章节信息 -->
        <div v-if="chapterText" class="manga-chapter">{{ chapterText }}</div>
      </div>

      <!-- 额外内容插槽 -->
      <slot name="extra-content"></slot>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber as defaultFormatNumber } from '@/utils/number.js'
import { formatDate as defaultFormatDate } from '@/utils/date.js'
import { useMangaCardClick } from '@/composables/useMangaCardClick.js'

const props = defineProps({
  // 漫画数据
  manga: {
    type: Object,
    required: true
  },
  // 卡片样式相关
  hoverable: {
    type: Boolean,
    default: true
  },
  cardClass: {
    type: String,
    default: 'manga-card'
  },
  naturalSize: {
    type: Boolean,
    default: false // 是否使用图片自然尺寸
  },
  // 显示类型
  displayType: {
    type: String,
    default: 'card', // 'card', 'grid', 'rank-item'
    validator: (value) => ['card', 'grid', 'rank-item'].includes(value)
  },
  // 布局相关
  useCardCover: {
    type: Boolean,
    default: false // 是否使用 a-card 的 cover 插槽
  },
  infoClass: {
    type: String,
    default: 'manga-info'
  },
  // 显示内容控制
  showAuthor: {
    type: Boolean,
    default: true
  },
  showMeta: {
    type: Boolean,
    default: true
  },
  showPopular: {
    type: Boolean,
    default: false
  },
  showDate: {
    type: Boolean,
    default: true
  },
  showChapter: {
    type: Boolean,
    default: false
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showOverlay: {
    type: Boolean,
    default: false
  },
  showUpdateBadge: {
    type: Boolean,
    default: false
  },
  // 自定义文本
  chapterText: {
    type: String,
    default: ''
  },
  overlayText: {
    type: String,
    default: ''
  },
  dateText: {
    type: String,
    default: ''
  },
  // 点击类型
  clickType: {
    type: String,
    default: 'online', // 'online', 'local', 'collection', 'custom'
    validator: (value) => ['online', 'local', 'collection', 'custom'].includes(value)
  },
  // 自定义点击函数（当 clickType 为 'custom' 时使用）
  onClick: {
    type: Function,
    default: null
  },
  // 数据来源（用于传递额外数据）
  item: {
    type: Object,
    default: null
  },
  // 格式化函数
  formatNumber: {
    type: Function,
    default: defaultFormatNumber
  },
  formatDate: {
    type: Function,
    default: defaultFormatDate
  },
  // 浏览记录相关
  browsing: {
    type: Object,
    default: null
  },
  browsingType: {
    type: String,
    default: 'comic' // comic, book, post, cartoon
  },
  // 排行榜相关
  ranking: {
    type: Number,
    default: null // 排名，null 表示不显示排名
  },
  trend: {
    type: String,
    default: null, // 'up', 'down', 'same', null
    validator: (value) => !value || ['up', 'down', 'same'].includes(value)
  },
  trendValue: {
    type: Number,
    default: 0 // 趋势变化的数值
  }
})

const emit = defineEmits(['click'])

const { handleMangaCardClick } = useMangaCardClick()

// 计算封面 URL
const coverUrl = computed(() => {
  return props.manga.cover || props.manga.coverUrl || '/logo.png'
})

// 计算作者文本
const authorText = computed(() => {
  if (!props.manga.author) return ''
  if (Array.isArray(props.manga.author)) {
    return props.manga.author.map(a => a.name).join(', ')
  }
  return props.manga.author
})

// 浏览记录相关计算属性
const actualManga = computed(() => {
  if (props.browsing) {
    const typeKey = props.browsingType
    return props.browsing[typeKey] || props.manga
  }
  return props.manga
})

const browsingLastChapter = computed(() => {
  if (!props.browsing) return ''

  const typeMap = {
    comic: 'last_chapter_name',
    book: 'last_volume_name',
    post: 'last_chapter_name',
    cartoon: 'last_chapter_name'
  }

  return props.browsing[typeMap[props.browsingType]] || ''
})

const browsingUpdateTime = computed(() => {
  if (!props.browsing || !actualManga.value) return ''
  return actualManga.value.datetime_updated || ''
})

// 计算显示的漫画数据
const displayManga = computed(() => {
  return actualManga.value || props.manga
})

// 重新计算作者文本基于显示的漫画数据
const displayAuthorText = computed(() => {
  if (!displayManga.value.author) return ''
  if (Array.isArray(displayManga.value.author)) {
    return displayManga.value.author.map(a => a.name).join(', ')
  }
  return displayManga.value.author
})

// 计算封面 URL 基于显示的漫画数据
const displayCoverUrl = computed(() => {
  return displayManga.value.cover || displayManga.value.coverUrl || '/logo.png'
})

// 徽章样式
const badgeStyle = computed(() => ({
  position: 'absolute',
  top: '8px',
  right: '8px'
}))

// 处理图片加载错误
const handleImageError = (e) => {
  e.target.src = '/logo.png'
}

// 处理点击事件
const handleClick = () => {
  const clickData = {
    manga: displayManga.value,
    item: props.browsing || props.item,
    clickType: props.clickType,
    browsing: props.browsing,
    browsingType: props.browsingType
  }

  // 发送自定义事件
  emit('click', clickData)

  // 如果有自定义点击函数，执行它
  if (props.onClick) {
    props.onClick(clickData)
  } else {
    // 否则执行默认点击逻辑
    handleMangaCardClick(clickData)
  }
}

// 排行榜相关计算属性
const showRanking = computed(() => {
  return props.ranking !== null
})

const rankingText = computed(() => {
  return props.ranking ? `#${props.ranking}` : ''
})

// 获取排名样式类
const getRankingClass = (ranking) => {
  if (ranking === 1) return 'rank-1'
  if (ranking === 2) return 'rank-2'
  if (ranking === 3) return 'rank-3'
  return ''
}
</script>

<style scoped src="../../assets/styles/manga-card.scss" lang="scss"></style>
