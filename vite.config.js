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
          'Cookie': 'webp=1; name=%E7%8B%AC%EF%BD%9E; user_id=85ea57c7-fe01-11ed-83ce-0678401a7187; avatar="user/cover/85ea57c7fe0111ed83ce0678401a7187/1704125272.jpg"; create="2023-05-29 09:16:41.364225+00:00"; comic_vip=1; cartoon_vip=1; email=""; token=e328b2200b64dba2335cc9bb2aa555e13a21e5b9; csrftoken=bnqhVqCqujIniwh29ewyYcwrl5NCN11T; sessionid=fzslho8lfai9wcmuerbjmltikdgm17yv'
        },
        cookieDomainRewrite: {
          '*': ''
        }
      }
    }
  },
})
