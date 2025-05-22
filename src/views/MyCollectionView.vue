<template>
    <div class="collection-container">
        <a-page-header title="我的书架" class="collection-header">
            <template #extra>
                <div class="header-actions">
                    <a-button type="primary" @click="refreshCollection">
                        {{ collectionStore.loading ? '加载中...' : '刷新' }}
                    </a-button>
                    <a-typography-text type="secondary" v-if="collectionStore.lastUpdateTime">
                        上次更新: {{ formatUpdateTime(collectionStore.lastUpdateTime) }}
                    </a-typography-text>
                </div>
            </template>
        </a-page-header>


        <a-alert v-if="collectionStore.error" type="error" :message="collectionStore.error" show-icon banner
            style="margin-bottom: 20px" />

        <a-empty v-if="!collectionStore.loading && !collectionStore.error && collectionStore.mangaList.length === 0"
            description="您的书架还是空的，快去收藏喜欢的漫画吧！" />

        <div v-else class="manga-grid">
            <a-card v-for="item in collectionStore.mangaList" :key="item.uuid" hoverable class="manga-card"
                @click="goToManga(item)">
                <div class="manga-cover">
                    <img :src="item.comic.cover" :alt="item.comic.name" />
                    <div class="last-read" v-if="item.last_browse">
                        上次阅读: {{ item.last_browse.last_browse_name }}
                    </div>
                </div>
                <a-card-meta :title="item.comic.name">
                    <template #description>
                        <div class="manga-author" v-if="item.comic.author && item.comic.author.length">
                            {{item.comic.author.map(a => a.name).join(', ')}}
                        </div>
                        <div class="manga-update">
                            更新至: {{ item.comic.last_chapter_name }}
                        </div>
                    </template>
                </a-card-meta>
            </a-card>
        </div>

    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCollectionStore } from '../stores/collection'
import { isLoggedIn } from '../utils/auth'
import { message } from 'ant-design-vue'

const router = useRouter()
const collectionStore = useCollectionStore()

const formatUpdateTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const goToManga = (item) => {
    // 将漫画基本信息保存到Pinia
    collectionStore.setCurrentManga(item.comic)
    
    // 直接跳转到详情页，不再通过URL传递数据
    router.push({
        name: 'MangaDetail',
        params: { pathWord: item.comic.path_word }
    })
}

const refreshCollection = () => {
    collectionStore.fetchCollection()
        .then(() => {
            message.success('书架更新成功')
        })
        .catch((error) => {
            console.error('获取书架失败', error)
            message.error('书架更新失败，请稍后重试')
        })
}

onMounted(() => {
    if (!isLoggedIn()) {
        message.warning('请先登录')
        router.push('/login')
        return
    }

    collectionStore.fetchCollection()
        .catch((error) => {
            console.error('获取书架失败', error)
            message.error('获取书架失败，请稍后重试')
        })
})
</script>

<style scoped>
.collection-container {
    padding: 0 20px 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.collection-header {
    margin-bottom: 24px;
    padding: 16px 0;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.manga-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
}

.manga-card {
    overflow: hidden;
    width: 100%;
}

.manga-card :deep(.ant-card-body) {
    padding: 12px;
}

.manga-card :deep(.ant-card-meta-title) {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.manga-card :deep(.ant-card-meta-description) {
    height: auto;
}

.manga-cover {
    position: relative;
    padding-top: 140%;
    overflow: hidden;
    margin-bottom: 8px;
}

.manga-cover img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.last-read {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    font-size: 12px;
    text-align: center;
}

.manga-author {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.manga-update {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
}
</style>