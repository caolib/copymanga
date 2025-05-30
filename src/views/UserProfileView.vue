<template>
    <div class="user-profile-container">
        <!-- 左侧侧栏导航 -->
        <a-layout>
            <a-layout-sider width="240" theme="light" class="user-profile-sider">
                <div class="user-sider-header">
                    <a-avatar :src="userInfo?.avatar || '/logo.jpg'" :alt="userInfo?.username || '用户头像'" :size="56"
                        @error="handleAvatarError" />
                    <div>
                        <div class="user-nickname">
                            {{ userInfo?.nickname || userInfo?.username || '用户' }}
                        </div>
                        <div class="user-username">
                            {{ userInfo?.username || '-' }}
                        </div>
                    </div>
                </div>

                <a-menu v-model:selectedKeys="selectedMenu" mode="inline" class="user-profile-menu">
                    <a-menu-item key="profile">
                        <template #icon><user-outlined /></template>
                        个人信息
                    </a-menu-item>
                    <a-menu-item key="browse-history">
                        <template #icon><history-outlined /></template>
                        浏览记录
                    </a-menu-item>
                </a-menu>
            </a-layout-sider>

            <a-layout-content class="user-profile-content">
                <!-- 个人信息页面 -->
                <div v-show="selectedMenu.includes('profile')">
                    <a-card :bordered="false" class="profile-card">
                        <template #title>
                            <div class="profile-title">个人资料</div>
                        </template>

                        <div class="profile-header">
                            <a-avatar :src="userInfo?.avatar || '/logo.jpg'" :alt="userInfo?.username || '用户头像'"
                                :size="80" @error="handleAvatarError" />
                            <div class="profile-info">
                                <a-typography-title :level="4" class="profile-name">
                                    {{ userInfo?.nickname || userInfo?.username || '用户' }}
                                </a-typography-title>
                            </div>
                        </div>

                        <a-divider />

                        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered>
                            <a-descriptions-item label="用户名">
                                {{ userInfo?.username || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="昵称">
                                {{ userInfo?.nickname || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="注册时间">
                                {{ formatDate(userInfo?.createdAt) || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="最后登录">
                                {{ formatDate(userInfo?.lastLoginAt) || '-' }}
                            </a-descriptions-item>
                        </a-descriptions>
                    </a-card>
                </div>

                <!-- 浏览记录页面 -->
                <div v-show="selectedMenu.includes('browse-history')" class="browse-history-content">
                    <a-card :bordered="false">
                        <template #title>
                            <div class="browse-history-title">浏览记录</div>
                        </template>

                        <!-- 浏览记录内容 -->
                        <div>
                            <a-spin :spinning="browseLoading">
                                <div class="browse-list-container">
                                    <a-row :gutter="[16, 16]">
                                        <a-col :span="8" v-for="(item, index) in browseList" :key="index">
                                            <a-card hoverable class="browse-card" @click="goToManga(item)">
                                                <div class="browse-card-content">
                                                    <div class="browse-card-cover">
                                                        <img :src="item.comic.cover" alt="cover" />
                                                    </div>
                                                    <div class="browse-card-info">
                                                        <div class="comic-title">{{ item.comic.name }}</div>
                                                        <div class="comic-chapter">最新: {{ item.comic.last_chapter_name
                                                            }}
                                                        </div>
                                                        <div class="comic-author">作者: {{item.comic.author.map(a =>
                                                            a.name).join('、')
                                                            }}</div>
                                                        <div class="read-chapter">已读: {{ item.last_chapter_name }}</div>
                                                    </div>
                                                </div>
                                            </a-card>
                                        </a-col>
                                    </a-row>

                                    <div class="browse-pagination">
                                        <a-pagination v-if="browseTotal > browseLimit" :total="browseTotal"
                                            :page-size="browseLimit"
                                            :current="Math.floor(browseOffset / browseLimit) + 1"
                                            @change="handleBrowsePageChange" show-size-changer
                                            :page-size-options="['6', '12', '18', '24']" :default-page-size="18" />
                                    </div>
                                </div>

                                <a-empty v-if="browseList.length === 0" description="暂无浏览记录" />
                            </a-spin>
                        </div>
                    </a-card>
                </div>
            </a-layout-content>
        </a-layout>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useMangaStore } from '../stores/manga'
import { message } from 'ant-design-vue'
import { getUserBrowseList } from '../api/browse'
import { UserOutlined, HistoryOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const mangaStore = useMangaStore()
const userInfo = computed(() => userStore.userInfo)

// 菜单选择相关
const selectedMenu = ref(['profile'])

// 监听菜单选择变化，当切换到浏览记录时自动加载
const watchMenuSelection = (newVal) => {
    if (newVal.includes('browse-history')) {
        loadBrowseList()
    }
}
watch(selectedMenu, watchMenuSelection)

// 浏览记录相关
const browseList = ref([])
const browseTotal = ref(0)
const browseLoading = ref(false)
const browseVisible = ref(true) // 默认显示，不需要通过按钮控制
const browseLimit = ref(18) // 默认每页18条记录
const browseOffset = ref(0)

function loadBrowseList() {
    browseLoading.value = true
    getUserBrowseList(browseLimit.value, browseOffset.value)
        .then(data => {
            browseList.value = data?.results?.list || []
            browseTotal.value = data?.results?.total || 0
            browseVisible.value = true
        })
        .catch(() => {
            message.error('获取浏览记录失败')
        })
        .finally(() => {
            browseLoading.value = false
        })
}

function handleBrowsePageChange(page, pageSize) {
    browseOffset.value = (page - 1) * pageSize
    browseLimit.value = pageSize
    loadBrowseList()
}

// 跳转到漫画详情页
const goToManga = (item) => {
    // 将漫画基本信息保存到Pinia
    mangaStore.setCurrentManga(item.comic)

    // 跳转到详情页
    router.push({
        name: 'MangaDetail',
        params: { pathWord: item.comic.path_word }
    })
}

// 组件挂载时获取最新的用户信息
onMounted(() => {
    userStore.fetchUserInfo().catch(() => { })
})

const handleAvatarError = (event) => {
    event.target.src = '/logo.jpg'
}

const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}
</script>

<style src="../assets/styles/user-profile.scss" lang="scss"></style>
