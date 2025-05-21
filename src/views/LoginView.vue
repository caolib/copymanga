<template>
    <div class="login-container">
        <a-card title="登录" :bordered="false" style="width: 400px;">
            <a-form :model="formState" name="login" @finish="handleLogin" autocomplete="off" layout="vertical">
                <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名!' }]">
                    <a-input v-model:value="formState.username" />
                </a-form-item>

                <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码!' }]">
                    <a-input-password v-model:value="formState.password" />
                </a-form-item>

                <a-form-item>
                    <a-button type="primary" html-type="submit" :loading="loading" block>
                        登录
                    </a-button>
                </a-form-item>
                <a-alert v-if="errorMessage" type="error" :message="errorMessage" />
            </a-form>
        </a-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
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
})

const handleLogin = () => {
    loading.value = true
    errorMessage.value = ''

    login(formState.username, formState.password)
        .then(result => {
            console.log('登录成功', result)

            // 保存用户信息到 Pinia 存储并持久化
            userStore.setUser({
                username: result.results.username,
                token: result.results.token,
                userInfo: result.results
            })

            message.success('登录成功')
            // 登录成功后跳转到首页
            router.push('/')
        })
        .catch(error => {
            console.error('登录失败', error)
            errorMessage.value = '登录失败，请检查用户名和密码'
        })
        .finally(() => {
            loading.value = false
        })
}

</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f2f5;
}
</style>