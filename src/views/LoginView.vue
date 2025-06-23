<template>
    <div class="login-container">
        <a-card class="login-card" :bordered="false">
            <template #title>
                <div class="app-logo">
                    <img src="/logo.png" alt="应用图标" class="logo-image" />
                </div>
            </template>

            <!-- 切换按钮 -->
            <div class="form-switch">
                <a-button :type="isLogin ? 'primary' : 'default'" @click="switchToLogin">登录</a-button>
                <a-button :type="!isLogin ? 'primary' : 'default'" @click="switchToRegister">注册</a-button>
            </div>

            <!-- 登录表单 -->
            <a-form v-if="isLogin" :model="loginForm" name="login" @finish="handleLogin" autocomplete="off"
                layout="vertical" class="auth-form">
                <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名!' }]">
                    <a-auto-complete v-model:value="loginForm.username" size="large" placeholder="请输入用户名或选择已保存的账号"
                        allow-clear :options="accountOptions" @change="handleUsernameChange"
                        @select="handleUsernameSelect">
                        <template #option="item">
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>{{ item.value }}</span>
                                <a-button type="text" size="small" danger @click.stop="removeSavedAccount(item.value)"
                                    :icon="h(CloseOutlined)"
                                    style="padding: 0; height: auto; border: none; font-size: 12px;">
                                </a-button>
                            </div>
                        </template>
                    </a-auto-complete>
                </a-form-item>

                <a-form-item name="password" :rules="[{ required: true, message: '请输入密码!' }]">
                    <a-input-password v-model:value="loginForm.password" size="large" placeholder="请输入密码" />
                </a-form-item>

                <a-form-item>
                    <a-checkbox v-model:checked="autoLoginEnabled">
                        自动登录
                    </a-checkbox>
                </a-form-item>

                <a-form-item>
                    <a-button type="primary" html-type="submit" :loading="loading" size="large" block>
                        登录
                    </a-button>
                </a-form-item>

                <a-alert v-if="errorMessage" type="error" :message="errorMessage" show-icon />
            </a-form>

            <!-- 注册表单 -->
            <a-form v-else :model="registerForm" name="register" @finish="handleRegister" autocomplete="off"
                layout="vertical" class="auth-form">
                <a-form-item name="username" :rules="usernameRules">
                    <a-input v-model:value="registerForm.username" size="large" placeholder="请输入用户名（6-36位英文数字混合）" />
                </a-form-item>

                <a-form-item name="password" :rules="passwordRules">
                    <a-input-password v-model:value="registerForm.password" size="large"
                        placeholder="请输入密码（6-36位英文数字混合）" />
                </a-form-item>

                <a-form-item name="confirmPassword" :rules="confirmPasswordRules">
                    <a-input-password v-model:value="registerForm.confirmPassword" size="large" placeholder="请确认密码" />
                </a-form-item>

                <a-form-item>
                    <a-button type="primary" html-type="submit" :loading="loading" size="large" block>
                        注册
                    </a-button>
                </a-form-item>

                <a-alert v-if="errorMessage" type="error" :message="errorMessage" show-icon />
            </a-form>
        </a-card>

        <div v-if="yiyan" class="yiyan-box">
            <span>{{ yiyan }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '../api/login'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import axios from 'axios'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')
const isLogin = ref(true) // 默认显示登录表单

// 登录表单数据
const loginForm = reactive({
    username: '',
    password: ''
})

// 自动登录状态
const autoLoginEnabled = ref(true)

// 计算属性：生成自动完成选项
const accountOptions = computed(() => {
    return userStore.savedAccounts.map(account => ({
        value: account.username,
        label: account.username
    }))
})

// 注册表单数据
const registerForm = reactive({
    username: '',
    password: '',
    confirmPassword: '',
})

// 用户名验证规则
const usernameRules = [
    { required: true, message: '请输入用户名!' },
    { min: 6, max: 36, message: '用户名长度应在6-36位之间!' },
    { pattern: /^[a-zA-Z0-9]+$/, message: '用户名只能包含英文字母和数字!' }
]

// 密码验证规则
const passwordRules = [
    { required: true, message: '请输入密码!' },
    { min: 6, max: 36, message: '密码长度应在6-36位之间!' },
    { pattern: /^[a-zA-Z0-9]+$/, message: '密码只能包含英文字母和数字!' }
]

// 确认密码验证规则
const confirmPasswordRules = [
    { required: true, message: '请确认密码!' },
    {
        validator: (rule, value) => {
            if (value && value !== registerForm.password) {
                return Promise.reject('两次输入的密码不一致!')
            }
            return Promise.resolve()
        }
    }
]

onMounted(() => {
    // 初始化自动登录状态
    autoLoginEnabled.value = userStore.autoLogin

    // 检查是否是添加账号操作
    const isAddAccountAction = router.currentRoute.value.query.action === 'add-account'

    // 如果启用自动登录且有保存的账号，且不是添加账号操作，尝试自动登录
    if (userStore.autoLogin && userStore.savedAccounts.length > 0 && !isAddAccountAction) {
        const recentAccount = userStore.getRecentAccount()
        if (recentAccount && recentAccount.username && recentAccount.password) {
            loginForm.username = recentAccount.username
            loginForm.password = recentAccount.password
            // 延迟执行自动登录，避免在组件还未完全挂载时执行
            setTimeout(() => {
                handleLogin()
            }, 500)
        }
    }

    getYiyan()
})

// 处理用户名选择变化
const handleUsernameChange = (username) => {
    const selectedAccount = userStore.savedAccounts.find(account => account.username === username)
    if (selectedAccount) {
        loginForm.password = selectedAccount.password
    } else {
        // 如果是手动输入的用户名，清空密码
        loginForm.password = ''
    }
}

// 处理用户名选择（从下拉列表选择）
const handleUsernameSelect = (username) => {
    const selectedAccount = userStore.savedAccounts.find(account => account.username === username)
    if (selectedAccount) {
        loginForm.password = selectedAccount.password
    }
}

// 删除保存的账号
const removeSavedAccount = (username) => {
    userStore.removeSavedAccount(username)
    message.success(`已删除账号: ${username}`)
    // 如果删除的是当前选中的账号，清空表单
    if (loginForm.username === username) {
        loginForm.username = ''
        loginForm.password = ''
    }
}

// 切换到登录模式
const switchToLogin = () => {
    isLogin.value = true
    errorMessage.value = ''
}

// 切换到注册模式
const switchToRegister = () => {
    isLogin.value = false
    errorMessage.value = ''
}

// 处理登录
const handleLogin = () => {
    loading.value = true
    errorMessage.value = ''

    // 保存自动登录设置
    userStore.setAutoLogin(autoLoginEnabled.value)

    login(loginForm.username, loginForm.password).then(result => {
        // V3 API的响应结构：{code: 200, message: "请求成功", results: {...}}
        if (result.code === 200 && result.results) {
            const userData = result.results

            // 保存用户信息到 Pinia 存储并持久化（使用V3 API字段）
            userStore.setUser({
                username: userData.username,
                token: userData.token, // 根据登录.json，token在results内部
                user_id: userData.user_id,
                nickname: userData.nickname,
                avatar: userData.avatar,
                datetime_created: userData.datetime_created,
                ticket: userData.ticket || 0,
                reward_ticket: userData.reward_ticket || 0,
                downloads: userData.downloads || 0,
                vip_downloads: userData.vip_downloads || 0,
                reward_downloads: userData.reward_downloads || 0,
                ads_vip_end: userData.ads_vip_end,
                post_vip_end: userData.post_vip_end,
                invite_code: userData.invite_code,
                invited: userData.invited,
                scy_answer: userData.scy_answer || false,
                day_downloads_refresh: userData.day_downloads_refresh || '',
                day_downloads: userData.day_downloads || 0,
                password: loginForm.password // 总是保存密码
            })

            message.success('登录成功')
            // 登录成功后回到上个界面或首页
            const redirectPath = router.currentRoute.value.query.redirect || '/'
            router.push(redirectPath)
        } else {
            throw new Error(result.message || '登录失败')
        }
    }).catch(error => {
        console.error('登录失败', error)
        errorMessage.value = error.message;
    }).finally(() => {
        loading.value = false
    })
}

// 处理注册
const handleRegister = () => {
    loading.value = true
    errorMessage.value = ''

    register(registerForm.username, registerForm.password).then(result => {
        // V3 API的响应结构：{code: 200, message: "请求成功", results: {...}}
        if (result.code === 200) {
            message.success('注册成功！请登录')
            // 注册成功后切换到登录模式并预填用户名
            isLogin.value = true
            loginForm.username = registerForm.username
            loginForm.password = registerForm.password
            loginForm.rememberPassword = true
            // 清空注册表单
            registerForm.username = ''
            registerForm.password = ''
            registerForm.confirmPassword = ''
        } else {
            throw new Error(result.message || '注册失败')
        }
    }).catch(error => {
        console.error('注册失败', error)
        // 优先展示后端返回的错误信息
        if (error.response && error.response.data) {
            if (error.response.data.detail) {
                errorMessage.value = error.response.data.detail
            } else if (error.response.data.message) {
                errorMessage.value = error.response.data.message
            } else {
                errorMessage.value = '注册失败，请检查网络连接或稍后重试'
            }
        } else if (error.message) {
            // 处理如超时等AxiosError
            errorMessage.value = error.message
        } else {
            errorMessage.value = '注册失败，请检查网络连接或稍后重试'
        }
    }).finally(() => {
        loading.value = false
    })
}


const yiyan = ref('')
const getYiyan = () => {
    axios.get('https://v1.hitokoto.cn/?c=b').then(response => {
        yiyan.value = `${response.data.hitokoto} - ${response.data.from}`
    }).catch(error => {
        console.error('获取一言失败:', error)
    })
}

</script>

<style src="../assets/styles/login.scss" lang="scss" scoped></style>
