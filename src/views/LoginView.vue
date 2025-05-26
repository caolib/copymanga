<template>
    <div class="login-container">
        <a-card class="login-card" :bordered="false">
            <template #title>
                <div class="card-title">{{ isLogin ? '登录' : '注册' }}</div>
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
                    <a-input v-model:value="loginForm.username" size="large" placeholder="请输入用户名" />
                </a-form-item>

                <a-form-item name="password" :rules="[{ required: true, message: '请输入密码!' }]">
                    <a-input-password v-model:value="loginForm.password" size="large" placeholder="请输入密码" />
                </a-form-item>

                <a-form-item>
                    <a-checkbox v-model:checked="loginForm.rememberPassword">
                        记住密码
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
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '../api/login'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')
const isLogin = ref(true) // 默认显示登录表单

// 登录表单数据
const loginForm = reactive({
    username: '',
    password: '',
    rememberPassword: false,
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
    // 自动填充账号密码
    if (userStore.username && userStore.password) {
        loginForm.username = userStore.username
        loginForm.password = userStore.password
        loginForm.rememberPassword = true
    }
})

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

    login(loginForm.username, loginForm.password).then(result => {
        // 保存用户信息到 Pinia 存储并持久化
        userStore.setUser({
            username: result.results.username,
            token: result.results.token,
            email: result.results.email || '',
            avatar: result.results.avatar || '',
            description: result.results.description || '',
            createdAt: result.results.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            stats: {
                totalRead: result.results.stats?.total_read || 0,
                totalChapters: result.results.stats?.total_chapters || 0,
                totalTime: result.results.stats?.total_time || 0,
                favorites: result.results.stats?.favorites || 0
            },
            password: loginForm.rememberPassword ? loginForm.password : ''
        })

        // 如果未勾选记住密码，清空pinia中的password
        if (!loginForm.rememberPassword) {
            userStore.password = ''
        }

        message.success('登录成功')
        // 登录成功后跳转到首页
        router.push('/')
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

</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f5f5f5;
    padding: 20px;
}

.login-card {
    width: 100%;
    max-width: 420px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    background: #fff;
}

.card-title {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    margin: 0;
}

.form-switch {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
    padding: 0 24px;
}

.form-switch .ant-btn {
    flex: 1;
    border-radius: 8px;
    height: 36px;
}

.auth-form {
    padding: 0 10px;
}

.auth-form .ant-form-item-label>label {
    font-weight: 500;
    color: #333;
}

.auth-form .ant-input,
.auth-form .ant-input-password {
    border-radius: 8px;
    border: 1px solid #d9d9d9;
}

.auth-form .ant-input:focus,
.auth-form .ant-input-password:focus,
.auth-form .ant-input-focused,
.auth-form .ant-input-password .ant-input:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.auth-form .ant-btn {
    border-radius: 8px;
    height: 42px;
    font-weight: 500;
}

.auth-form .ant-checkbox-wrapper {
    color: #666;
}

.auth-form .ant-alert {
    border-radius: 8px;
    margin-top: 16px;
}
</style>
