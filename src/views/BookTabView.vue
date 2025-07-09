<template>
    <div class="book-tab-view">
        <a-tabs v-model:activeKey="activeTab">
            <a-tab-pane key="home" tab="轻小说主页">
                <BookHomeView />
            </a-tab-pane>
            <a-tab-pane key="search" tab="轻小说搜索">
                <BookSearchTab />
            </a-tab-pane>
        </a-tabs>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import BookHomeView from './BookHomeView.vue'
import BookSearchTab from '@/components/book/BookSearchTab.vue'

const a = ref(1)

const activeTab = ref('home')
</script>
