import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./stores";
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import "./assets/styles/main.css";

createApp(App)
    .use(router)
    .use(pinia)
    .use(Antd)
    .mount("#app");
