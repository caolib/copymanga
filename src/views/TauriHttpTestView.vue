<template>
  <div class="tauri-http-test">
    <a-card title="Tauri HTTP 测试" class="test-card">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <div>
          <h3>测试接口</h3>
          <a-space>
            <a-button type="primary" @click="testHomeIndex" :loading="loading.homeIndex">
              获取首页数据
            </a-button>
            <a-button type="primary" @click="testNewestManga" :loading="loading.newestManga">
              获取最新漫画
            </a-button>
            <a-button type="primary" @click="testMangaDetail" :loading="loading.mangaDetail">
              获取漫画详情
            </a-button>
          </a-space>
        </div>

        <a-divider />

        <div v-if="currentTest">
          <h3>测试结果: {{ currentTest }}</h3>
          <div class="result-container">
            <a-spin :spinning="isLoading">
              <pre>{{ JSON.stringify(result, null, 2) }}</pre>
            </a-spin>
          </div>
        </div>
      </a-space>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getHomeIndex, getNewestManga, getMangaDetail } from '../http/manga'

const result = ref(null)
const currentTest = ref('')
const loading = ref({
  homeIndex: false,
  newestManga: false,
  mangaDetail: false
})

const isLoading = computed(() => {
  return Object.values(loading.value).some(v => v)
})

async function testHomeIndex() {
  currentTest.value = '首页数据'
  loading.value.homeIndex = true
  try {
    result.value = await getHomeIndex()
  } catch (error) {
    result.value = { error: error.message }
  } finally {
    loading.value.homeIndex = false
  }
}

async function testNewestManga() {
  currentTest.value = '最新漫画'
  loading.value.newestManga = true
  try {
    result.value = await getNewestManga()
  } catch (error) {
    result.value = { error: error.message }
  } finally {
    loading.value.newestManga = false
  }
}

async function testMangaDetail() {
  currentTest.value = '漫画详情'
  loading.value.mangaDetail = true
  try {
    // 使用一个示例的漫画路径
    const pathWord = 'zhoushuhuizhan'
    result.value = await getMangaDetail(pathWord)
  } catch (error) {
    result.value = { error: error.message }
  } finally {
    loading.value.mangaDetail = false
  }
}
</script>

<style scoped src="../assets/styles/tauri-http-test.scss" lang="scss"></style>