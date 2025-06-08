<template>
    <div class="register-container">
        <a-card class="register-card" :bordered="false">
            <template #title>
                <div class="card-title">注册</div>
            </template>

            <a-form :model="formState" name="register" @finish="handleRegister" autocomplete="off" layout="vertical"
                class="register-form">
                <a-form-item name="username" :rules="usernameRules">
                    <a-input v-model:value="formState.username" size="large" placeholder="请输入用户名（6-36位英文数字混合）" />
                </a-form-item>

                <a-form-item name="password" :rules="passwordRules">
                    <a-input-password v-model:value="formState.password" size="large"
                        placeholder="请输入密码（6-36位英文数字混合）" />
                </a-form-item>

                <a-form-item name="confirmPassword" :rules="confirmPasswordRules">
                    <a-input-password v-model:value="formState.confirmPassword" size="large" placeholder="请确认密码" />
                </a-form-item>

                <a-form-item>
                    <a-button type="primary" html-type="submit" :loading="loading" size="large" block>
                        注册
                    </a-button>
                </a-form-item>

                <a-form-item>
                    <div class="register-footer">
                        已有账号？
                        <router-link to="/login" class="login-link">立即登录</router-link>
                    </div>
                </a-form-item>

                <a-alert v-if="errorMessage" type="error" :message="errorMessage" show-icon />
            </a-form>
        </a-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/login'
import { message } from 'ant-design-vue'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

const formState = reactive({
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
            if (value && value !== formState.password) {
                return Promise.reject('两次输入的密码不一致!')
            }
            return Promise.resolve()
        }
    }
]

const handleRegister = () => {
    loading.value = true
    errorMessage.value = ''

    register(formState.username, formState.password).then(result => {
        message.success('注册成功！请登录')
        // 注册成功后跳转到登录页面
        router.push('/login')
    }).catch(error => {
        console.error('注册失败', error)
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage.value = error.response.data.message
        } else {
            errorMessage.value = '注册失败，请检查网络连接或稍后重试'
        }
    }).finally(() => {
        loading.value = false
    })
}

</script>

<style src="../assets/styles/register.scss" scoped></style>
