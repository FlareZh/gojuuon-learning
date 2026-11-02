import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import "./style.css";

/**
 * 注册 Service Worker（PWA），立即检查更新。
 * @副作用 注册 SW、可能触发后续缓存更新
 */
registerSW({ immediate: true });

createApp(App).mount("#app");
