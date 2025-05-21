import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    open: true,
    proxy: {
      '/dev': {
        target: 'https://www.copy20.com',
        changeOrigin: true,
        secure: false,
        bypass: (req, res, proxyOptions) => {
          // 记录请求情况，帮助调试
          console.log('请求:', req.method, req.url);
        },
        rewrite: (path) => path.replace(/^\/dev/, ''),
        headers: {
          'Referer': 'https://www.copy20.com/',
          'Pragma': 'no-cache',
        }
      }
    }
  },
})
