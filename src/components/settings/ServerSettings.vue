<template>
  <div>
    <a-card title="API源配置" class="setting-card" id="api-config">
      <template #extra>
        <a-alert type="info" show-icon style="width: fit-content;">
          <template #message> 建议使用默认第一个 </template>
        </a-alert>
      </template>
      <a-form layout="vertical">
        <!-- 当前API源选择 - 改为可输入的下拉菜单 -->
        <a-form-item>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-select v-model:value="currentApiIndex" style="width: 100%;" @change="onApiSourceChange">
                <a-select-option v-for="(source, index) in apiSources" :key="index" :value="index">
                  {{ source }}
                  <a-button v-if="apiSources.length > 1" type="text" danger size="small" :icon="h(DeleteOutlined)"
                    style="margin-left: 8px" @click.stop="removeApiSource(index)"
                    :loading="removingIndex === index"></a-button>
                </a-select-option>
              </a-select>
            </a-col>
            <a-col :span="16">
              <a-input-group compact>
                <a-input v-model:value="newApiInput" placeholder="输入API源" style="width: calc(100% - 80px);"
                  @pressEnter="addNewApiSource" />
                <a-button type="primary" @click="addNewApiSource" :loading="addingSource">
                  添加
                </a-button>
              </a-input-group>
            </a-col>
          </a-row>
        </a-form-item>

        <!-- 官方API源 -->
        <a-collapse @change="onCollapseChange" class="setting-card-collapse">
          <a-collapse-panel key="official-sources" header="从官方源添加">
            <template #extra>
              <a-button type="link" size="small" @click.stop="fetchOfficialApiSources"
                :loading="loadingOfficialSources">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </a-button>
            </template>
            <a-spin :spinning="loadingOfficialSources">
              <div v-if="officialApiSources.length === 0" class="empty-list">
                <a-empty description="暂无官方源" :image="false" />
              </div>
              <a-list v-else :data-source="officialApiSources" bordered size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <template #actions>
                      <a-button type="link" @click="quickAddApiSource(item)" :disabled="isApiSourceExist(item)">
                        {{ isApiSourceExist(item) ? '已添加' : '添加' }}
                      </a-button>
                    </template>
                    {{ item }}
                  </a-list-item>
                </template>
              </a-list>
            </a-spin>
          </a-collapse-panel>
        </a-collapse>
      </a-form>
    </a-card>

    <!-- 请求头配置 -->
    <a-card title="请求头配置" class="setting-card" id="headers-config">
      <template #extra>
        <a-alert type="info" show-icon style="width: fit-content;">
          <template #message> 出现破解警告时点击获取官方版本更新请求头 </template>
        </a-alert>
      </template>
      <a-form layout="vertical">
        <!-- 添加新请求头 -->
        <a-form-item label="添加新请求头">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-input v-model:value="newHeader.key" placeholder="请求头名称" @keyup.enter="addNewHeader" />
            </a-col>
            <a-col :span="14">
              <a-input v-model:value="newHeader.value" placeholder="请求头值" @keyup.enter="addNewHeader" />
            </a-col>
            <a-col :span="2">
              <a-button type="primary" @click="addNewHeader" :icon="h(PlusOutlined)"
                :disabled="!newHeader.key || !newHeader.value" block>
              </a-button>
            </a-col>
          </a-row>
        </a-form-item>

        <!-- 现有请求头列表 -->
        <a-form-item>
          <div v-if="headersList.length === 0" class="empty-headers">
            <a-empty description="暂无请求头配置" :image="false" />
          </div>
          <div v-else class="headers-list">
            <div v-for="(header, index) in headersList" :key="index" class="header-item">
              <a-row :gutter="16" align="middle">
                <a-col :span="8">
                  <a-input v-model:value="header.key" placeholder="请求头名称" @change="onHeaderChange(index)" />
                </a-col>
                <a-col :span="14">
                  <a-input v-model:value="header.value" placeholder="请求头值" @change="onHeaderChange(index)" />
                </a-col>
                <a-col :span="2">
                  <a-button type="text" danger @click="removeHeader(index)" :icon="h(DeleteOutlined)" block>
                  </a-button>
                </a-col>
              </a-row>
            </div>
          </div>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button @click="fetchRemoteHeaders" :loading="fetchingRemoteHeaders" type="primary"
              :icon="h(GithubOutlined)">
              从github导入
            </a-button>

            <a-button @click="saveAllHeaders" :loading="savingHeaders"> 保存 </a-button>

            <a-button @click="exportHeaders" :loading="exportingHeaders" :icon="h(DownloadOutlined)">
              导出到文件
            </a-button>

            <a-button @click="importHeaders" :loading="importingHeaders" :icon="h(UploadOutlined)">
              从文件导入
            </a-button>

            <a-popconfirm title="你确定?" ok-text="对的" cancel-text="不对" @confirm="resetHeaders">
              <a-button>恢复默认</a-button>
            </a-popconfirm>

            <a-button @click="checkAppVersion" :loading="checkingAppVersion" type="primary">
              获取官方APP版本
            </a-button>
          </a-space>
        </a-form-item>

        <!-- 版本检查状态 - 单独一行 -->
        <a-form-item v-if="remoteAppVersion">
          <a-alert :type="versionDiff ? 'warning' : 'success'" show-icon style="width: fit-content">
            <template #message>
              检测到官方APP版本：{{ remoteAppVersion }}，
              <span v-if="versionDiff">当前请求头版本与官方不一致</span>
              <span v-else>当前请求头版本已与官方一致</span>
              <a-button v-if="versionDiff" type="primary" size="small" style="margin-left: 12px"
                @click="applyRemoteVersion">一键同步</a-button>
            </template>
          </a-alert>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 轻小说API源配置 -->
    <a-card title="轻小说API源配置" class="setting-card" id="book-api-config">
      <template #extra>
        <a-alert type="info" show-icon style="width: fit-content;">
          <template #message> 目前就这一个源 </template>
        </a-alert>
      </template>
      <a-form layout="vertical">
        <!-- 当前轻小说API源选择 -->
        <a-form-item>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-select v-model:value="currentBookApiIndex" style="width: 100%;" @change="onBookApiSourceChange"
                placeholder="选择轻小说API源">
                <a-select-option v-for="(source, index) in bookApiSources" :key="index" :value="index">
                  {{ source }}
                  <a-button v-if="bookApiSources.length > 1" type="text" danger size="small" :icon="h(DeleteOutlined)"
                    style="margin-left: 8px" @click.stop="removeBookApiSource(index)"
                    :loading="removingBookIndex === index"></a-button>
                </a-select-option>
              </a-select>
            </a-col>
            <a-col :span="16">
              <a-input-group compact>
                <a-input v-model:value="newBookApiSource.url" placeholder="输入轻小说API源" style="width: calc(100% - 80px);"
                  @pressEnter="addNewBookApiSource" />
                <a-button type="primary" @click="addNewBookApiSource" :loading="addingBookSource">
                  添加
                </a-button>
              </a-input-group>
            </a-col>
          </a-row>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card class="setting-card" id="status">
      <div class="restart-section">
        <a-space>
          <a-button type="primary" @click="handleRestart" :loading="restarting" danger :icon="h(ReloadOutlined)">
            重启应用
          </a-button>
          <a-button @click="openConfigDirectory" :icon="h(SettingOutlined)" :loading="openingDirectory">
            打开配置目录
          </a-button>
        </a-space>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { h, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  GithubOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import {
  getAppConfig,
  getRequestHeaders,
  getServerConfig,
  saveAppConfig,
  saveRequestHeaders,
  switchApiSource,
  switchBookApiSource,
  getDefaultRequestHeaders,
  addApiSource,
  removeApiSource as removeApiSourceFromConfig,
  addBookApiSource,
  removeBookApiSource as removeBookApiSourceFromConfig,
} from '@/config/server-config'
import { useAppStore } from '@/stores/app'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'
import { restartApp } from '@/utils/restart-helper'
import {
  exportHeaders as exportHeadersConfig,
  importHeaders as importHeadersConfig,
} from '@/utils/export-helper'
import { getOfficialApiSources } from '@/api/api-source'
import { getHeadersConfig } from '@/api/github'
import { getAppVersion } from '@/api/system'

const appForm = ref({ apiDomain: '' })
const currentApiDomain = ref('')
const restarting = ref(false)
const openingDirectory = ref(false)
const appStore = useAppStore()

// API源管理相关状态
const apiSources = ref([])
const currentApiIndex = ref(0)
const newApiInput = ref('') // 用于存储输入的新API源
const addingSource = ref(false)
const removingIndex = ref(-1)

// 官方API源相关状态
const officialApiSources = ref([])
const loadingOfficialSources = ref(false)
const checkingAppVersion = ref(false)

// 轻小说API源管理相关状态
const bookApiSources = ref([])
const currentBookApiIndex = ref(0)
const currentBookApiDomain = ref('未配置')
const newBookApiSource = ref({ url: '' })
const addingBookSource = ref(false)
const removingBookIndex = ref(-1)

// 请求头配置相关状态
const headersList = ref([])
const newHeader = ref({ key: '', value: '' })
const savingHeaders = ref(false)
const exportingHeaders = ref(false)
const importingHeaders = ref(false)
const fetchingRemoteHeaders = ref(false)

// 版本检查相关状态
const remoteAppVersion = ref('')
const versionDiff = ref(false)

// 处理API源搜索/输入
const onApiSourceSearch = (value) => {
  if (typeof value === 'string') {
    newApiInput.value = value
  }
}

// 加载当前配置
const loadConfig = () => {
  // 加载应用配置
  getAppConfig()
    .then((config) => {
      // 加载漫画API源
      apiSources.value = config.apiSources || []

      // 如果有API源，确保索引有效
      if (apiSources.value.length > 0) {
        // 如果索引无效，重置为0
        if (config.currentApiIndex < 0 || config.currentApiIndex >= apiSources.value.length) {
          currentApiIndex.value = 0
          // 同时保存更新后的配置
          saveAppConfig({
            apiSources: apiSources.value,
            currentApiIndex: 0,
            bookApiSources: config.bookApiSources || [],
            currentBookApiIndex: config.currentBookApiIndex || 0,
          }).catch((error) => {
            console.warn('保存修正后的配置失败:', error)
          })
        } else {
          currentApiIndex.value = config.currentApiIndex
        }

        // 设置当前域名
        const currentSource = apiSources.value[currentApiIndex.value]
        currentApiDomain.value = currentSource
        appForm.value.apiDomain = currentSource
      } else {
        // 没有API源时，重置索引
        currentApiIndex.value = -1
        currentApiDomain.value = '未配置'
        appForm.value.apiDomain = ''
      }

      // 加载轻小说API源
      bookApiSources.value = config.bookApiSources || []

      // 如果有轻小说API源，确保索引有效
      if (bookApiSources.value.length > 0) {
        // 如果索引无效，重置为0
        if (
          config.currentBookApiIndex < 0 ||
          config.currentBookApiIndex >= bookApiSources.value.length
        ) {
          currentBookApiIndex.value = 0
          // 同时保存更新后的配置
          saveAppConfig({
            apiSources: config.apiSources || [],
            currentApiIndex: config.currentApiIndex || 0,
            bookApiSources: bookApiSources.value,
            currentBookApiIndex: 0,
          }).catch((error) => {
            console.warn('保存修正后的轻小说配置失败:', error)
          })
        } else {
          currentBookApiIndex.value = config.currentBookApiIndex
        }

        // 设置当前轻小说域名
        currentBookApiDomain.value = bookApiSources.value[currentBookApiIndex.value]
      } else {
        // 没有轻小说API源时，重置索引
        currentBookApiIndex.value = -1
        currentBookApiDomain.value = '未配置'
      }
    })
    .catch((error) => {
      message.error('加载应用配置失败')
    })

  // 加载请求头配置
  getRequestHeaders()
    .then((headers) => {
      // 将对象转换为键值对数组
      headersList.value = Object.entries(headers || {}).map(([key, value]) => ({
        key,
        value,
      }))
    })
    .catch((error) => {
      console.warn('加载请求头配置失败:', error)
      headersList.value = []
    })
}

// 处理重启应用
const handleRestart = async () => {
  restarting.value = true

  await restartApp().catch((error) => {
    console.error('重启应用失败:', error)
    message.error('重启应用失败')
    restarting.value = false
  })
}

// API源切换
const onApiSourceChange = async (value) => {
  // 如果value是字符串，说明是用户输入，设置为newApiInput
  if (typeof value === 'string') {
    newApiInput.value = value
    return
  }

  try {
    const index = Number(value)
    const source = await switchApiSource(index)
    currentApiDomain.value = source
    appForm.value.apiDomain = source
    message.success(`已切换到: ${source}，如果没有生效请重启再尝试`)
  } catch (error) {
    message.error(error.message || '切换API源失败')
    // 切换失败时恢复原值
    loadConfig()
  }
}

// 添加API源
const addNewApiSource = async () => {
  const url = newApiInput.value
  if (!url) {
    message.error('请输入API源URL')
    return
  }

  addingSource.value = true
  try {
    await addApiSource(url)
    message.success('API源添加成功')
    newApiInput.value = ''
    loadConfig() // 重新加载配置
  } catch (error) {
    message.error(error.message || '添加API源失败')
  } finally {
    addingSource.value = false
  }
}

// 删除API源
const removeApiSource = async (index) => {
  if (apiSources.value.length <= 1) {
    message.error('至少需要保留一个API源')
    return
  }

  removingIndex.value = index
  try {
    await removeApiSourceFromConfig(index)
    message.success('API源删除成功')
    loadConfig() // 重新加载配置
  } catch (error) {
    message.error(error.message || '删除API源失败')
  } finally {
    removingIndex.value = -1
  }
}

// 轻小说API源切换
const onBookApiSourceChange = async (index) => {
  try {
    const source = await switchBookApiSource(index)
    currentBookApiDomain.value = source
    message.success(`已切换轻小说API源到: ${source}，如果没有生效请重启再尝试`)
  } catch (error) {
    message.error(error.message || '切换轻小说API源失败')
    // 切换失败时恢复原值
    loadConfig()
  }
}

// 添加轻小说API源
const addNewBookApiSource = async () => {
  if (!newBookApiSource.value.url) {
    message.error('请输入轻小说API URL')
    return
  }

  addingBookSource.value = true
  try {
    await addBookApiSource(newBookApiSource.value.url)
    message.success('轻小说API源添加成功')
    newBookApiSource.value = { url: '' }
    loadConfig() // 重新加载配置
  } catch (error) {
    message.error(error.message || '添加轻小说API源失败')
  } finally {
    addingBookSource.value = false
  }
}

// 删除轻小说API源
const removeBookApiSource = async (index) => {
  if (bookApiSources.value.length <= 1) {
    message.error('至少需要保留一个轻小说API源')
    return
  }

  removingBookIndex.value = index
  try {
    await removeBookApiSourceFromConfig(index)
    message.success('轻小说API源删除成功')
    loadConfig() // 重新加载配置
  } catch (error) {
    message.error(error.message || '删除轻小说API源失败')
  } finally {
    removingBookIndex.value = -1
  }
}

// 添加新请求头
const addNewHeader = () => {
  if (!newHeader.value.key || !newHeader.value.value) {
    message.error('请输入完整的请求头名称和值')
    return
  }

  // 检查是否已存在相同的键
  const existingIndex = headersList.value.findIndex((header) => header.key === newHeader.value.key)
  if (existingIndex !== -1) {
    message.error('该请求头已存在，请使用不同的名称')
    return
  }

  headersList.value.push({
    key: newHeader.value.key,
    value: newHeader.value.value,
  })

  // 清空输入框
  newHeader.value = { key: '', value: '' }
  message.success('请求头已添加')
}

// 删除请求头
const removeHeader = (index) => {
  headersList.value.splice(index, 1)
  message.success('请求头已删除')
}

// 请求头值变化时的处理
const onHeaderChange = (index) => {
  // 这里可以添加实时验证逻辑
  const header = headersList.value[index]
  if (!header.key || !header.value) {
    console.warn(`请求头 ${index} 的键或值为空`)
  }
}

// 保存所有请求头配置
const saveAllHeaders = async () => {
  savingHeaders.value = true

  try {
    // 验证所有请求头
    const invalidHeaders = headersList.value.filter((header) => !header.key || !header.value)
    if (invalidHeaders.length > 0) {
      message.error('存在空的请求头键或值，请检查配置')
      savingHeaders.value = false
      return
    }

    // 检查重复的键
    const keys = headersList.value.map((header) => header.key)
    const uniqueKeys = new Set(keys)
    if (keys.length !== uniqueKeys.size) {
      message.error('存在重复的请求头键，请检查配置')
      savingHeaders.value = false
      return
    }

    // 转换为对象格式保存
    const headersObject = {}
    headersList.value.forEach((header) => {
      headersObject[header.key] = header.value
    })

    await saveRequestHeaders(headersObject)
    message.success('请求头配置保存成功！如果没有生效请重启再尝试')
  } catch (error) {
    message.error(error.message || '保存请求头配置失败')
  } finally {
    savingHeaders.value = false
  }
}

// 重置请求头为默认值
const resetHeaders = async () => {
  try {
    const defaultHeaders = getDefaultRequestHeaders()
    headersList.value = Object.entries(defaultHeaders).map(([key, value]) => ({
      key,
      value,
    }))
    await saveRequestHeaders(defaultHeaders)
    message.success('已恢复默认请求头配置，如果没有生效请重启再尝试')
  } catch (error) {
    message.error('重置请求头配置失败')
    console.error('重置请求头配置失败:', error)
  }
}

// 导出请求头配置
const exportHeaders = async () => {
  try {
    exportingHeaders.value = true
    await exportHeadersConfig(headersList.value)
  } catch (error) {
    console.error('导出请求头配置失败:', error)
  } finally {
    exportingHeaders.value = false
  }
}

// 导入请求头配置
const importHeaders = async () => {
  try {
    importingHeaders.value = true

    const importedData = await importHeadersConfig()
    if (importedData) {
      // 将导入的对象转换为 headersList 格式
      headersList.value = Object.entries(importedData).map(([key, value]) => ({
        key,
        value,
      }))

      // 自动保存导入的配置
      try {
        await saveRequestHeaders(importedData)
        message.success('请求头配置已导入并保存，如果没有生效请重启再尝试')
      } catch (saveError) {
        message.error('导入成功但保存失败，请手动保存配置')
        console.error('保存导入的配置失败:', saveError)
      }
    }
  } catch (error) {
    console.error('导入请求头配置失败:', error)
  } finally {
    importingHeaders.value = false
  }
}

// 获取远程请求头配置
const fetchRemoteHeaders = async () => {
  fetchingRemoteHeaders.value = true
  getHeadersConfig()
    .then((headers) => {
      if (headers && typeof headers === 'object' && Object.keys(headers).length > 0) {
        headersList.value = Object.entries(headers).map(([key, value]) => ({ key, value }))
        saveAllHeaders()
        message.success('远程请求头配置已应用，如果没有生效请重启再尝试')
      } else {
        message.error('远程配置为空或格式不正确')
      }
    })
    .catch((err) => {
      message.error('获取失败，请保证能正常访问github')
      console.error('获取远程headers.json失败:', err)
    })
    .finally(() => {
      fetchingRemoteHeaders.value = false
    })
}

// 打开配置目录
const openConfigDirectory = async () => {
  openingDirectory.value = true

  await appDataDir()
    .then((appDataPath) => {
      const configDir = appDataPath + '\\config'
      return invoke('open_file_explorer', { path: configDir })
    })
    .catch((error) => {
      message.error('打开配置目录失败: ' + (error.message || error))
      console.error('打开配置目录失败:', error)
    })
    .finally(() => {
      openingDirectory.value = false
    })
}

// 获取app版本并对比请求头
const checkAppVersion = () => {
  checkingAppVersion.value = true
  getAppVersion().then(res => {
    if (res.results && res.results.android) {
      const remoteVersion = res.results.android.version
      remoteAppVersion.value = remoteVersion
      const versionHeader = headersList.value.find(h => h.key.toLowerCase() === 'version')
      const currentVersion = versionHeader ? versionHeader.value : ''
      versionDiff.value = remoteVersion && remoteVersion !== currentVersion
    } else {
      remoteAppVersion.value = ''
      versionDiff.value = false
      message.error('获取版本信息失败')
    }
  }).finally(() => {
    checkingAppVersion.value = false
  })
}

const applyRemoteVersion = () => {
  const versionHeader = headersList.value.find(h => h.key.toLowerCase() === 'version')
  const currentVersion = versionHeader ? versionHeader.value : ''
  if (remoteAppVersion.value && currentVersion && remoteAppVersion.value !== currentVersion) {
    if (versionHeader) versionHeader.value = remoteAppVersion.value
    headersList.value.forEach(h => {
      if (h.key.toLowerCase() === 'user-agent' || h.key.toLowerCase() === 'referer') {
        if (currentVersion && h.value.includes(currentVersion)) {
          h.value = h.value.replaceAll(currentVersion, remoteAppVersion.value)
        }
      }
    })
    versionDiff.value = false
    message.success('版本号已替换为最新')
    saveAllHeaders().catch(error => {
      message.error('保存请求头失败: ' + (error.message || error))
    })
  }
}

//  折叠面板变化
const onCollapseChange = async (keys) => {
  if (keys.includes('official-sources') && officialApiSources.value.length === 0) {
    await fetchOfficialApiSources()
  }
}

//  获取官方API源
const fetchOfficialApiSources = async () => {
  loadingOfficialSources.value = true
  try {
    // 使用API获取官方源
    officialApiSources.value = await getOfficialApiSources()
  } catch (error) {
    message.error('获取官方API源失败')
    console.error('获取官方API源失败:', error)
    // 获取失败时显示空列表
    officialApiSources.value = []
  } finally {
    loadingOfficialSources.value = false
  }
}

//  快速添加API源
const quickAddApiSource = async (url) => {
  // 检查是否已存在
  if (isApiSourceExist(url)) {
    message.info('该API源已存在')
    return
  }

  // 使用现有逻辑添加
  newApiInput.value = url
  await addNewApiSource()
  // 添加后清空输入框，以免影响手动添加
  newApiInput.value = ''
}

//  检查API源是否存在
const isApiSourceExist = (url) => {
  return apiSources.value.includes(url)
}

onMounted(() => {
  loadConfig()
})

onBeforeUnmount(() => {
  // 清理资源，如果有的话
})
</script>

<style src="../../assets/styles/server-settings.scss" lang="scss" scoped></style>
