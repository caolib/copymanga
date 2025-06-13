<template>
    <div class="cartoon-home-view">
        <div class="cartoon-home-container">
            <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
                <a-tab-pane key="home" tab="主页">
                    <CartoonHomeTab />
                </a-tab-pane> <a-tab-pane key="search" tab="搜索">
                    <CartoonSearchTab />
                </a-tab-pane>
                <a-tab-pane key="topics" tab="专题">
                    <CartoonTopicTab />
                </a-tab-pane>
            </a-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import CartoonHomeTab from '../components/cartoon/CartoonHomeTab.vue'
import CartoonSearchTab from '../components/cartoon/CartoonSearchTab.vue'
import CartoonTopicTab from '../components/cartoon/CartoonTopicTab.vue'

const activeTab = ref('home')

const handleTabChange = (key) => {
    activeTab.value = key
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/cartoon-home.scss';
</style>
