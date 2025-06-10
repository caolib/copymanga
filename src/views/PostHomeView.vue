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
    </div>
</template>

<script setup>
import { ref } from 'vue'
import PostHomeTab from '../components/post/PostHomeTab.vue'
import PostNewTab from '../components/post/PostNewTab.vue'
import PostDiscoverTab from '../components/post/PostDiscoverTab.vue'
import PostRankingTab from '../components/post/PostRankingTab.vue'

const activeTab = ref('home')

const handleTabChange = (key) => {
    activeTab.value = key
}
</script>

<style scoped src="../assets/styles/post-home.scss" lang="scss"></style>
