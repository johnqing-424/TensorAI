// 简单的CORS代理服务器
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

// 允许特定源的CORS请求，并支持凭据
app.use(cors({
    origin: ['http://localhost:3000', 'http://192.168.1.131:3000'], // 显式列出允许的源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'appid'],
    credentials: true // 支持凭据
}));

// 解析JSON请求体
app.use(express.json());

// 测试端点
app.get('/test', (req, res) => {
    res.json({ status: 'CORS代理服务器运行中' });
});

// 代理POST请求到login端点
app.post('/proxy/login', async (req, res) => {
    try {
        console.log('代理请求到login:', req.body);
        const response = await fetch('http://192.168.1.131:8080/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': req.headers.token || '',
                'appid': req.headers.appid || 'process'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        console.log('代理响应:', data);
        res.json(data);
    } catch (error) {
        console.error('代理错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 代理会话相关的请求
app.use('/proxy/sessions', async (req, res) => {
    try {
        const url = `http://192.168.1.131:8080/api/sessions`;
        console.log(`代理会话请求: ${req.method} ${url}`);

        const headers = {
            'Content-Type': 'application/json'
        };

        // 转发认证头
        if (req.headers.token) {
            headers.token = req.headers.token;
        }
        if (req.headers.appid) {
            headers.appid = req.headers.appid;
        }

        const response = await fetch(url, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('代理错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 支持/proxy/api/sessions路径 (适配客户端错误路径)
app.use('/proxy/api/sessions', async (req, res) => {
    try {
        const url = `http://192.168.1.131:8080/api/sessions`;
        console.log(`代理会话请求(api路径): ${req.method} ${url}`);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (req.headers.token) {
            headers.token = req.headers.token;
        }
        if (req.headers.appid) {
            headers.appid = req.headers.appid;
        }

        const response = await fetch(url, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('代理错误(api路径):', error);
        res.status(500).json({ error: error.message });
    }
});

// 处理消息相关的请求
app.use('/proxy/messages', async (req, res) => {
    try {
        const url = `http://192.168.1.131:8080/api/messages`;
        console.log(`代理消息请求: ${req.method} ${url}`);

        const headers = {
            'Content-Type': 'application/json'
        };

        // 转发认证头
        if (req.headers.token) {
            headers.token = req.headers.token;
        }
        if (req.headers.appid) {
            headers.appid = req.headers.appid;
        }

        const response = await fetch(url, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('代理错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 支持/proxy/api/messages路径
app.use('/proxy/api/messages', async (req, res) => {
    try {
        const url = `http://192.168.1.131:8080/api/messages`;
        console.log(`代理消息请求(api路径): ${req.method} ${url}`);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (req.headers.token) {
            headers.token = req.headers.token;
        }
        if (req.headers.appid) {
            headers.appid = req.headers.appid;
        }

        const response = await fetch(url, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('代理错误(api路径):', error);
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`CORS代理服务器运行在 http://localhost:${PORT}`);
}); 