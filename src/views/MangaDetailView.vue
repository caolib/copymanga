<template>
    <a-card class="manga-detail-container" :bordered="false">
        <a-skeleton :loading="detailLoading" active avatar>
            <template #skeleton>
                <a-row :gutter="32">
                    <a-col :xs="24" :sm="8">
                        <a-skeleton-image style="width: 100%; height: 350px; border-radius: 8px;" />
                    </a-col>
                    <a-col :xs="24" :sm="16">
                        <a-skeleton-input style="width: 60%; margin-bottom: 16px;" size="large" />
                        <a-skeleton paragraph active :rows="6" />
                        <div style="margin: 24px 0;">
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" style="margin-right: 10px;" />
                            <a-skeleton-button size="large" />
                        </div>
                        <a-skeleton-input style="width: 20%; margin-bottom: 12px;" />
                        <a-skeleton paragraph :rows="3" />
                    </a-col>
                </a-row>
            </template>

            <a-row :gutter="32">
                <a-col :xs="24" :sm="8">
                    <a-image :src="manga.cover" :alt="manga.name" width="100%" height="350px"
                        style="border-radius: 8px; object-fit: cover;" :placeholder="true">
                        <template #placeholder>
                            <div class="image-placeholder">
                                <a-spin size="large" />
                                <div style="margin-top: 12px; color: #666;">加载中...</div>
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
                    <a-typography-title :level="2">{{ manga.name || '漫画详情' }}</a-typography-title>
                    <a-descriptions :column="1" size="small" bordered>
                        <a-descriptions-item label="作者" v-if="manga.author && manga.author.length">
                            <a-tag v-for="a in manga.author" :key="a.name" @click="goToAuthorPage(a)"
                                class="author-tag">
                                {{ a.name }}
                            </a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="题材" v-if="manga.theme && manga.theme.length">
                            <a-tag v-for="t in manga.theme" :key="t.name" color="blue">{{ t.name }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="状态" v-if="manga.status">
                            <a-tag color="green">{{ manga.status.display }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item label="人气" v-if="manga.popular">
                            {{ formatNumber(manga.popular) }}
                        </a-descriptions-item>
                        <a-descriptions-item label="最新章节" v-if="manga.last_chapter && manga.last_chapter.name">
                            {{ manga.last_chapter.name }}
                        </a-descriptions-item>
                        <a-descriptions-item label="更新时间" v-if="manga.datetime_updated">
                            {{ formatDate(manga.datetime_updated) }}
                        </a-descriptions-item>
                    </a-descriptions>
                    <div style="margin-top: 20px;">
                        <a-typography-title :level="4">简介</a-typography-title>

                        <!-- 来自书架时显示上次阅读信息 -->
                        <div v-if="fromCollection && lastBrowseInfo" class="last-browse-info">
                            <a-alert :message="`上次阅读: ${lastBrowseInfo.last_browse_name || '未知章节'}`" type="info"
                                show-icon style="margin-bottom: 16px;"
                                :description="lastBrowseInfo.datetime_browse ? `阅读时间: ${formatDate(lastBrowseInfo.datetime_browse)}` : null" />
                        </div>

                        <a-typography-paragraph>{{ manga.brief || '暂无简介' }}</a-typography-paragraph>
                    </div>
                </a-col>
            </a-row>
        </a-skeleton>
        <a-divider />

        <a-row justify="space-between" align="middle" style="margin-bottom: 12px;">
            <a-col>
                <a-space>
                    <!-- 排序切换 -->
                    <a-button @click="toggleSortOrder" size="small">
                        {{ isAscending ? '正序' : '倒序' }}
                    </a-button>

                    <!-- 批量下载按钮 -->
                    <a-dropdown>
                        <template #overlay>
                            <a-menu>
                                <a-menu-item key="download-current-page" @click="downloadCurrentPage">
                                    下载当前页章节
                                </a-menu-item>
                                <a-menu-item key="download-all" @click="downloadAllChapters">
                                    下载全部章节
                                </a-menu-item>
                                <a-menu-item key="download-not-downloaded" @click="downloadNotDownloadedChapters">
                                    下载未下载章节
                                </a-menu-item>
                            </a-menu>
                        </template>
                        <a-button size="small">
                            批量下载
                            <DownOutlined />
                        </a-button>
                    </a-dropdown>

                    <!-- 来自书架时显示继续阅读按钮 -->
                    <a-button v-if="fromCollection && lastBrowseInfo && lastBrowseInfo.last_browse_id" type="primary"
                        @click="continueReading" size="small">
                        继续阅读
                    </a-button>
                    <!-- 常规开始阅读按钮 -->
                    <a-button v-else type="primary" @click="startReading" :disabled="!chapters.length" size="small">
                        开始阅读
                    </a-button>

                    <!-- 根据来源显示不同的收藏按钮 -->
                    <template v-if="fromCollection">
                        <!-- 来自书架只显示取消收藏按钮 -->
                        <a-button danger @click="handleCollect(false)" :loading="collectLoading" size="small">
                            取消收藏
                        </a-button>
                    </template>
                    <template v-else>
                        <!-- 其他来源显示完整的收藏按钮 -->
                        <a-button @click="handleCollect" :loading="collectLoading" size="small">
                            加入书架
                        </a-button>
                        <a-button danger @click="handleCollect(false)" :loading="collectLoading" size="small">
                            取消收藏
                        </a-button>
                    </template>

                    <a-button @click="fetchMangaData" size="small">刷新数据</a-button>
                </a-space>
            </a-col>
        </a-row>

        <!-- 分组Tab页 -->
        <a-tabs v-model:activeKey="currentGroup" @change="handleGroupChange" size="small" style="margin-bottom: 16px;">
            <a-tab-pane v-for="(group, key) in groups" :key="key" :tab="`${group.name} (${group.count})`">
            </a-tab-pane>
        </a-tabs>

        <a-skeleton :loading="loading || groupLoading" active>
            <a-row :gutter="[12, 12]">
                <a-col :xs="12" :sm="8" :md="6" :lg="4" :xl="3" v-for="chapter in sortedChapters" :key="chapter.id">
                    <a-card :hoverable="true" style="text-align:center; padding:0; position: relative;" size="small"
                        :body-style="{ padding: '12px 6px' }"
                        :class="{ 'last-read-chapter': isLastReadChapter(chapter) }">

                        <!-- 下载状态标签 - 左上角 -->
                        <a-tag v-if="chapterDownloadStatus[chapter.id] === 'downloaded'" color="success"
                            class="download-status-tag">
                            <template #icon>
                                <check-circle-outlined />
                            </template>
                        </a-tag>
                        <a-tag v-else-if="chapterDownloadStatus[chapter.id] === 'downloading'" color="processing"
                            class="download-status-tag">
                            <template #icon>
                                <sync-outlined :spin="true" />
                            </template>
                        </a-tag>

                        <!-- 章节名称 -->
                        <div @click="goToChapter(chapter)" style="cursor:pointer; margin-bottom: 8px;">
                            <span style="font-size:14px;">{{ chapter.name }}</span>
                            <!-- 显示"上次阅读"标记 -->
                            <div v-if="isLastReadChapter(chapter)" class="last-read-tag">
                                上次
                            </div>
                        </div>

                        <!-- 下载状态和操作按钮 -->
                        <div class="chapter-actions" style="width: 100%;">
                            <!-- 下载进度条 (仅在下载中时显示) -->
                            <div v-if="chapterDownloadStatus[chapter.id] === 'downloading'"
                                style="width: 100%; margin-bottom: 8px;">
                                <a-progress :percent="chapterDownloadProgress[chapter.id] || 0"
                                    :status="chapterDownloadProgress[chapter.id] >= 100 ? 'success' : 'active'"
                                    :stroke-width="8" :show-info="true" style="width: 100%;" />
                            </div>

                            <!-- 按钮区域 -->
                            <div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
                                <!-- 下载按钮 -->
                                <a-button
                                    v-if="!chapterDownloadStatus[chapter.id] || chapterDownloadStatus[chapter.id] === 'error'"
                                    type="primary" size="small" @click="downloadChapter(chapter)"
                                    :icon="h(DownloadOutlined)">
                                </a-button>

                                <!-- 已下载章节的删除按钮 -->
                                <a-button v-if="chapterDownloadStatus[chapter.id] === 'downloaded'" size="small" danger
                                    @click="deleteChapter(chapter)" :title="'删除章节'" :icon="h(DeleteOutlined)">
                                </a-button>
                            </div>
                        </div>
                    </a-card>
                </a-col>
            </a-row>
        </a-skeleton>

        <!-- 分页组件 -->
        <div v-if="totalChapters > pageSize" class="pagination-container">
            <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="totalChapters"
                :show-size-changer="true" :show-quick-jumper="true"
                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 章`"
                :page-size-options="['20', '50', '100', '200']" @change="handlePageChange"
                @showSizeChange="handlePageChange" style="margin-top: 24px; text-align: center;" />
        </div>

        <!-- 漫画评论区 -->
        <a-collapse v-model:activeKey="commentsActiveKey" style="margin-top: 24px;" @change="handleCommentsToggle">
            <a-collapse-panel key="comments" header="漫画评论">
                <!-- 评论输入框 -->
                <div v-if="commentsActiveKey.includes('comments')" class="comment-input-section"
                    style="margin-bottom: 16px;">
                    <a-textarea v-model:value="newComment" placeholder="这里是评论区，不是无人区..." :rows="1" :maxlength="200"
                        show-count style="margin-bottom: 8px;" />
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <a-button type="primary" @click="submitComment" :loading="submitCommentLoading"
                            :disabled="!newComment.trim() || !isLoggedIn" size="small">
                            发送
                        </a-button>
                    </div>
                </div>
                <a-divider v-if="commentsActiveKey.includes('comments')" style="margin: 16px 0;" />

                <a-skeleton :loading="commentsLoading" active>
                    <div v-if="comments.length === 0 && !commentsLoading"
                        style="text-align: center; color: #999; padding: 20px;">
                        暂无评论
                    </div>
                    <div v-else>
                        <div class="compact-comments-container">
                            <a-comment v-for="comment in comments" :key="comment.id" :author="comment.user_name"
                                :avatar="comment.user_avatar" :content="comment.comment"
                                :datetime="formatDate(comment.create_at)" class="compact-comment-item" />
                        </div>

                        <!-- 评论分页 -->
                        <div v-if="commentsTotal > commentsPageSize" style="text-align: center; margin-top: 16px;">
                            <a-pagination v-model:current="commentsPage" v-model:page-size="commentsPageSize"
                                :total="commentsTotal" :show-size-changer="false" :show-quick-jumper="true"
                                :show-total="(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条评论`"
                                @change="handleCommentsPageChange" size="small" />
                        </div>
                    </div>
                </a-skeleton>
            </a-collapse-panel>
        </a-collapse>
    </a-card>
</template>

<script setup>
import { onMounted } from 'vue'
import { formatDate } from '../utils/date'
import { formatNumber } from '@/utils/number'
import { DownOutlined, CheckCircleOutlined, SyncOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useMangaDetail } from '../composables/useMangaDetail'
import { h } from 'vue'

// 使用 composable
const {
    // 响应式状态
    manga,
    chapters,
    loading,
    detailLoading,
    collectLoading,
    isAscending,
    groups,
    currentGroup,
    groupLoading,
    currentPage,
    pageSize,
    totalChapters,
    fromCollection,
    lastBrowseInfo,
    comments,
    commentsLoading,
    commentsActiveKey,
    commentsPage,
    commentsPageSize,
    commentsTotal,
    newComment,
    submitCommentLoading,
    chapterDownloadStatus,
    chapterDownloadProgress,

    // 计算属性
    isLoggedIn,
    sortedChapters,

    // 方法
    toggleSortOrder,
    goToChapter,
    goToAuthorPage,
    startReading,
    continueReading,
    isLastReadChapter,
    fetchMangaData,
    handlePageChange,
    handleGroupChange,
    handleCollect,
    handleCommentsToggle,
    handleCommentsPageChange,
    submitComment,
    downloadChapter,
    downloadCurrentPage,
    downloadAllChapters,
    downloadNotDownloadedChapters,
    deleteChapter,
    initializePage
} = useMangaDetail()

onMounted(() => {
    initializePage()
})
</script>

<style src="../assets/styles/manga-detail.scss" scoped></style>
