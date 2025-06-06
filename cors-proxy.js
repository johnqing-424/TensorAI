// 简单的CORS代理服务器
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const url = require('url');

// 后端API地址
const BACKEND_API_URL = 'http://localhost:8080'; // 修改为实际的Tensor-AI后端地址

// 允许特定源的CORS请求，并支持凭据
app.use(cors({
    origin: ['http://localhost:3000', 'http://192.168.1.131:3000'], // 显式列出允许的源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'appid', 'Cache-Control', 'Accept', 'Connection', 'Keep-Alive'],
    exposedHeaders: ['Content-Type', 'Authorization', 'token', 'appid'],
    credentials: true // 支持凭据
}));

// 解析JSON请求体
app.use(express.json());

// 测试端点
app.get('/test', (req, res) => {
    res.json({ status: 'CORS代理服务器运行中' });
});

// 通用代理中间件
app.use('/proxy', async (req, res) => {
    try {
        const targetPath = req.path;

        // 获取并转发所有查询参数
        const queryParams = new URLSearchParams(req.query).toString();
        const queryString = queryParams ? `?${queryParams}` : '';

        // 检查前端请求路径是否已经包含 /api 前缀
        const apiPath = targetPath.startsWith('/api') ? targetPath : `/api${targetPath}`;
        const finalUrl = `${BACKEND_API_URL}${apiPath}${queryString}`;

        // 记录详细的请求信息，便于调试
        console.log(`原始请求路径: ${targetPath}`);
        console.log(`处理后API路径: ${apiPath}`);
        console.log(`最终请求URL: ${finalUrl}`);
        console.log(`请求方法: ${req.method}`);
        console.log(`查询字符串: ${queryString}`);



        console.log(`代理请求: ${req.method} ${finalUrl}`);
        console.log('请求头:', req.headers);
        console.log('查询参数:', req.query);

        // 构建请求头 - 复制所有重要头部
        const headers = {
            'Content-Type': req.headers['content-type'] || 'application/json',
            'Accept': req.headers['accept'] || 'application/json',
            'Cache-Control': 'no-cache'
        };

        // 转发认证头和其他重要头部
        if (req.headers.token) {
            headers.token = req.headers.token;
            console.log('转发token:', req.headers.token.substring(0, 10) + '...');
        }

        if (req.headers.appid) {
            headers.appid = req.headers.appid;
            console.log('转发appid:', req.headers.appid);
        }

        // 发送请求到后端
        const response = await fetch(finalUrl, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        console.log(`收到响应: ${response.status} ${response.statusText}`);
        console.log('响应头:', response.headers.raw());

        // 判断是否是流式响应
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
            // 设置响应头
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // 流式传输数据
            response.body.pipe(res);
        } else {
            // 常规JSON响应
            const data = await response.json();
            res.json(data);
        }
    } catch (error) {
        console.error('代理错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`CORS代理服务器运行在 http://localhost:${PORT}`);
    console.log(`代理后端API: ${BACKEND_API_URL}`);
});