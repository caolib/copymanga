import express from 'express';
import cors from 'cors';
import axios from 'axios';
import qs from 'qs';

const app = express();

// 启用CORS
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 代理中间件
app.use('/proxy', async (req, res) => {
    try {
        console.log(`[Proxy] ${req.method} ${req.originalUrl}`);
        const targetUrl = `https://copy20.com${req.path.replace('/proxy', '')}`;
        const headers = {
            ...req.headers,
            'Referer': 'https://copy20.com/',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };
        delete headers.host;
        delete headers.origin;
        delete headers['content-length'];
        // 不要删除 content-type

        // 关键：form-data 转字符串
        const isForm = req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded');
        const data = req.method !== 'GET'
            ? (isForm ? qs.stringify(req.body) : req.body)
            : undefined;

        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: headers,
            params: req.query,
            data: data,
            responseType: 'arraybuffer'
        });

        // 设置响应头，排除 set-cookie，单独处理
        Object.keys(response.headers).forEach(key => {
            if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(key.toLowerCase())) {
                res.set(key, response.headers[key]);
            }
        });
        // 关键：转发所有 set-cookie
        if (response.headers['set-cookie']) {
            res.setHeader('Set-Cookie', response.headers['set-cookie']);
        }

        res.status(response.status).send(response.data);
    } catch (error) {
        console.error(`[Proxy Error] ${req.method} ${req.originalUrl} -> ${error.message}`);
        res.status(500).json({ error: '代理请求失败' });
    }
});

// 启动服务器
const PORT = 5001; // 使用不同的端口，避免与Python服务器冲突
app.listen(PORT, () => {
    console.log(`Node.js 代理服务器运行在 http://localhost:${PORT}`);
}); 