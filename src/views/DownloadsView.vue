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
                <a-tab-pane key="manga" tab="漫画">
                    <div class="manga-downloads">
                        <a-skeleton :loading="loading" active>
                            <div v-if="mangaList.length === 0 && !loading" class="empty-state">
                                <a-empty description="暂无已下载的漫画">
                                    <template #image>
                                        <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px;" />
                                    </template>
                                </a-empty>
                            </div>
                            <div v-else class="manga-grid"> <a-row :gutter="[16, 16]">
                                    <a-col :xs="24" :sm="12" :md="10" :lg="6" :xl="4" v-for="manga in mangaList"
                                        :key="manga.uuid">
                                        <a-card :hoverable="true" class="manga-card"
                                            @click="goToMangaDetail(manga.uuid)">
                                            <template #cover>
                                                <div class="manga-cover-container">
                                                    <img :src="manga.coverUrl || '/logo.png'" :alt="manga.name"
                                                        class="manga-cover" @error="handleImageError" />
                                                    <div class="manga-overlay">
                                                        <div class="download-info">
                                                            <span class="chapter-count">
                                                                {{ manga.chapterCount }} 章节
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                            <a-card-meta :title="manga.name">
                                                <template #description>
                                                    <div class="manga-meta">
                                                        <p v-if="manga.author && manga.author.length"
                                                            class="manga-author">
                                                            作者: {{ manga.author.join(', ') }}
                                                        </p>
                                                        <p v-if="manga.status" class="manga-status">
                                                            状态: {{ manga.status }}
                                                        </p>
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
                                    <a-col v-for="cartoon in cartoonList" :key="cartoon.uuid" :xs="24" :sm="12" :md="10"
                                        :lg="6" :xl="4">
                                        <a-card class="download-card" hoverable
                                            @click="goToCartoonDetail(cartoon.uuid)">
                                            <template #cover>
                                                <div class="card-cover">
                                                    <img :src="cartoon.coverUrl || '/logo.png'" :alt="cartoon.name"
                                                        @error="handleImageError" />
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
                                    <img src="/logo.png" alt="暂无数据" style="width: 64px; height: 64px;" />
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
import { ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { formatDate } from '../utils/date'
import { getDownloadedMangaList } from '../api/manga'
import { getDownloadedCartoonList } from '../api/cartoon'

const router = useRouter()

// 响应式数据
const activeTab = ref('manga')
const loading = ref(false)
const mangaList = ref([])
const cartoonLoading = ref(false)
const cartoonList = ref([])

// 页面生命周期
onMounted(() => {
    loadDownloadedMangas()
})

// 加载已下载的漫画列表
const loadDownloadedMangas = async () => {
    loading.value = true

    await getDownloadedMangaList().then(data => {
        mangaList.value = data || []
        // console.log('已下载的漫画列表:', mangaList.value)
    }).catch(error => {
        console.error('获取下载列表失败:', error)
        message.error('获取下载列表失败')
        mangaList.value = []
    }).finally(() => {
        loading.value = false
    })
}

// 加载已下载的动画列表
const loadDownloadedCartoons = async () => {
    cartoonLoading.value = true

    await getDownloadedCartoonList().then(data => {
        cartoonList.value = data || []
        // console.log('已下载的动画列表:', JSON.stringify(cartoonList.value, null, 2))
    }).catch(error => {
        console.error('获取动画下载列表失败:', error)
        message.error('获取动画下载列表失败')
        cartoonList.value = []
    }).finally(() => {
        cartoonLoading.value = false
    })
}

// 刷新下载列表
const refreshDownloads = () => {
    if (activeTab.value === 'manga') {
        loadDownloadedMangas()
    } else if (activeTab.value === 'cartoon') {
        loadDownloadedCartoons()
    }
}

// Tab切换处理
const handleTabChange = (key) => {
    activeTab.value = key
    if (key === 'manga') {
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
    event.target.src = '/logo.png'
}
</script>

<style scoped src="../assets/styles/downloads.scss"></style>
