<template>
    <div class="user-profile-container">
        <!-- 左侧侧栏导航 -->
        <a-layout>
            <a-layout-sider width="200" theme="light" class="user-profile-sider">
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
                                <div v-if="!editingNickname" class="nickname-display">
                                    <span>{{ userInfo?.nickname || '-' }}</span>
                                    <a-button type="text" size="small" @click="startEditNickname" class="edit-btn">
                                        <template #icon><edit-outlined /></template>
                                        编辑
                                    </a-button>
                                </div>
                                <div v-else class="nickname-edit">
                                    <a-input v-model:value="tempNickname" placeholder="请输入昵称" :maxlength="20" show-count
                                        size="small" @pressEnter="saveNickname" />
                                    <div class="edit-actions">
                                        <a-button type="primary" size="small" :loading="savingNickname"
                                            @click="saveNickname">
                                            保存
                                        </a-button>
                                        <a-button size="small" @click="cancelEditNickname">
                                            取消
                                        </a-button>
                                    </div>
                                </div>
                            </a-descriptions-item>
                            <a-descriptions-item label="注册时间">
                                {{ formatDate(userInfo?.createdAt) || '-' }}
                            </a-descriptions-item>
                            <a-descriptions-item label="最后登录">
                                {{ formatUserProfileDate(userInfo?.lastLoginAt) || '-' }}
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
import { useMangaNavigation } from '../composables/useMangaNavigation'
import { formatUserProfileDate } from '../utils/date'
import { message } from 'ant-design-vue'
import { getUserBrowseList } from '../api/browse'
import { updateUserNickname } from '../api/user'
import { UserOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const { goToMangaDetail } = useMangaNavigation()
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

// 昵称编辑相关
const editingNickname = ref(false)
const tempNickname = ref('')
const savingNickname = ref(false)

// 开始编辑昵称
function startEditNickname() {
    editingNickname.value = true
    tempNickname.value = userInfo.value?.nickname || ''
}

// 取消编辑昵称
function cancelEditNickname() {
    editingNickname.value = false
    tempNickname.value = ''
}

// 保存昵称
function saveNickname() {
    if (!tempNickname.value.trim()) {
        message.error('昵称不能为空')
        return
    }

    if (tempNickname.value === userInfo.value?.nickname) {
        editingNickname.value = false
        return
    }

    savingNickname.value = true
    updateUserNickname(tempNickname.value.trim())
        .then(() => {
            message.success('昵称修改成功')
            // 更新本地用户信息
            userStore.updateUserInfo({ nickname: tempNickname.value.trim() })
            editingNickname.value = false
        })
        .catch(error => {
            if (error.response?.status === 400) {
                message.error('昵称已被占用，请换一个试试')
            } else {
                message.error('昵称修改失败')
            }
        })
        .finally(() => {
            savingNickname.value = false
        })
}

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
    // 使用统一的导航逻辑
    goToMangaDetail(item.comic)
}

// 组件挂载时获取最新的用户信息
onMounted(() => {
    userStore.fetchUserInfo().catch(() => { })
})

const handleAvatarError = (event) => {
    event.target.src = '/logo.jpg'
}
</script>

<style src="../assets/styles/user-profile.scss" lang="scss"></style>
