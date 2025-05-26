<template>
    <a-row justify="center" style="margin-top: 16px;">
        <a-col :xs="24" :sm="22" :md="14" :lg="10">
            <a-card :bodyStyle="{ padding: '16px 20px' }">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <a-avatar :src="userInfo?.avatar || '/logo.jpg'" :alt="userInfo?.username || '用户头像'" :size="48"
                        @error="handleAvatarError" />
                    <div style="flex: 1;">
                        <a-typography-title :level="5" style="margin-bottom: 2px;">
                            {{ userInfo?.nickname || userInfo?.username || '用户' }}
                        </a-typography-title>
                        <a-typography-paragraph type="secondary" style="margin-bottom: 0; font-size: 13px;">
                            {{ userInfo?.description || '这个用户很懒，什么都没有写...' }}
                        </a-typography-paragraph>
                    </div>
                </div>
                <a-descriptions :column="1" size="small" :responsive="false">
                    <a-descriptions-item label="用户名">
                        {{ userInfo?.username || '-' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="昵称">
                        {{ userInfo?.nickname || '-' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="注册">
                        {{ formatDate(userInfo?.createdAt) || '-' }}
                    </a-descriptions-item>
                    <a-descriptions-item label="最后登录">
                        {{ formatDate(userInfo?.lastLoginAt) || '-' }}
                    </a-descriptions-item>
                </a-descriptions>
            </a-card>
        </a-col>
    </a-row>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// 组件挂载时获取最新的用户信息
onMounted(async () => {
    try {
        await userStore.fetchUserInfo()
    } catch (error) {
        message.error('获取用户信息失败')
    }
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

<style scoped>
/* 可根据需要继续微调 */
</style>
