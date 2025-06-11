<template>
    <div class="post-home-view">
        <div class="post-home-container">
            <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
                <a-tab-pane key="home" tab="首页">
                    <PostHomeTab />
                </a-tab-pane>
                <a-tab-pane key="new" tab="全新上架">
                    <PostNewTab />
                </a-tab-pane>
                <a-tab-pane key="discover" tab="发现">
                    <PostDiscoverTab />
                </a-tab-pane>
                <a-tab-pane key="ranking" tab="排行榜">
                    <PostRankingTab />
                </a-tab-pane>
            </a-tabs>
        </div>

        <!-- 年龄确认弹窗 -->
        <a-modal v-model:visible="ageConfirmVisible" title="年龄确认" :maskClosable="false" :closable="false"
            :keyboard="false" :footer="null" centered width="400px">
            <div class="age-confirm-content">
                <a-alert type="warning" showIcon message="内容提示" description="本区域包含成人内容，仅限年满18周岁人士浏览。" />
                <div class="age-confirm-text">
                    <p>请确认您已年满18周岁，且在您所在的国家或地区法律允许的情况下浏览此内容。</p>
                    <p>点击"我已满18周岁"按钮，即表示您确认已达到合法年龄，并同意自行承担浏览内容的责任。</p>
                </div>
            </div>
            <div class="age-confirm-footer">
                <a-space>
                    <a-button @click="rejectAgeConfirm">离开</a-button>
                    <a-button type="primary" @click="acceptAgeConfirm">我已满18周岁</a-button>
                </a-space>
            </div>
        </a-modal>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { message } from 'ant-design-vue'
import PostHomeTab from '../components/post/PostHomeTab.vue'
import PostNewTab from '../components/post/PostNewTab.vue'
import PostDiscoverTab from '../components/post/PostDiscoverTab.vue'
import PostRankingTab from '../components/post/PostRankingTab.vue'

const router = useRouter()
const appStore = useAppStore()
const activeTab = ref('home')
const ageConfirmVisible = ref(false)

const handleTabChange = (key) => {
    activeTab.value = key
}

// 确认年龄
const acceptAgeConfirm = () => {
    // 使用Promise包装调用，确保能够处理潜在错误
    new Promise(resolve => {
        appStore.setPostAgeConfirmed(true)
        resolve()
    }).then(() => {
        ageConfirmVisible.value = false
        // message.success('已确认年龄，欢迎浏览')
    }).catch(error => {
        // 如果方法不存在，直接更新状态
        appStore.postAgeConfirmed = true
        ageConfirmVisible.value = false
        // message.success('已确认年龄，欢迎浏览')
    })
}

// 拒绝年龄确认
const rejectAgeConfirm = () => {
    router.push('/')
}

// 组件挂载时检查是否已确认年龄
onMounted(() => {
    // 使用可选链操作符防止属性不存在导致的错误
    const isAgeConfirmed = typeof appStore.postAgeConfirmed !== 'undefined' ? appStore.postAgeConfirmed : false
    if (!isAgeConfirmed) {
        ageConfirmVisible.value = true
    }
})
</script>

<style scoped src="../assets/styles/post-home.scss" lang="scss"></style>
