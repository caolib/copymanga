<template>
    <div class="home">
        <a-row>
            <a-col :span="24">
                <a-card title="欢迎使用拷贝漫画">
                    <a-space direction="vertical" size="large">
                        <a-typography-title :level="3">拷贝漫画</a-typography-title>
                        <a-typography-paragraph>
                            这是一个基于拷贝漫画官方API的前端项目，使用Vue 3和Ant Design Vue构建。
                        </a-typography-paragraph> <a-space>
                            <a-button type="primary" @click="$router.push('/my-collection')">我的书架</a-button>
                            <a-button @click="$router.push('/login')">登录</a-button>
                        </a-space>
                    </a-space>
                </a-card>
            </a-col>
        </a-row>
    </div>
</template>

<script setup>

</script>

<style scoped>
.home {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}
</style>