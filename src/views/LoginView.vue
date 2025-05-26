<template>
    <div class="login-container">
        <a-card class="login-card" :bordered="false">
            <template #title>
                <div class="card-title">登录</div>
            </template>

            <a-form :model="formState" name="login" @finish="handleLogin" autocomplete="off" layout="vertical"
                class="login-form">
                <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名!' }]">
                    <a-input v-model:value="formState.username" size="large" placeholder="请输入用户名" />
                </a-form-item>

                <a-form-item name="password" :rules="[{ required: true, message: '请输入密码!' }]">
                    <a-input-password v-model:value="formState.password" size="large" placeholder="请输入密码" />
                </a-form-item>

                <a-form-item>
                    <a-checkbox v-model:checked="formState.rememberPassword">
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
        </a-card>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/login'
import { useUserStore } from '../stores/user'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errorMessage = ref('')

const formState = reactive({
    username: '',
    password: '',
    rememberPassword: false,
})

onMounted(() => {
    // 自动填充账号密码
    if (userStore.username && userStore.password) {
        formState.username = userStore.username
        formState.password = userStore.password
        formState.rememberPassword = true
    }
})

const handleLogin = () => {
    loading.value = true
    errorMessage.value = ''

    login(formState.username, formState.password).then(result => {
        // 保存用户信息到 Pinia 存储并持久化
        userStore.setUser({
            username: result.results.username,
            token: result.results.token,
            userInfo: result.results,
            password: formState.rememberPassword ? formState.password : ''
        })

        // 如果未勾选记住密码，清空pinia中的password
        if (!formState.rememberPassword) {
            userStore.password = ''
        }

        message.success('登录成功')
        // 登录成功后跳转到首页
        router.push('/')
    }).catch(error => {
        console.error('登录失败', error)
        errorMessage.value = '登录失败，请检查用户名和密码'
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
    height: 80vh;
    background: #f5f5f5;
}

.login-card {
    width: 380px;
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

.login-form {
    padding: 0 24px 24px;
}

.login-form .ant-form-item-label>label {
    font-weight: 500;
    color: #333;
}

.login-form .ant-input,
.login-form .ant-input-password {
    border-radius: 8px;
    border: 1px solid #d9d9d9;
}

.login-form .ant-input:focus,
.login-form .ant-input-password:focus,
.login-form .ant-input-focused,
.login-form .ant-input-password .ant-input:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.login-form .ant-btn {
    border-radius: 8px;
    height: 42px;
    font-weight: 500;
}

.login-form .ant-checkbox-wrapper {
    color: #666;
}

.login-form .ant-alert {
    border-radius: 8px;
    margin-top: 16px;
}
</style>