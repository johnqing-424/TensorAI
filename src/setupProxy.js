const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://localhost:8080',
            changeOrigin: true,
            logLevel: 'debug',
            // 支持流式响应
            ws: true,
            timeout: 180000, // 3分钟超时
            proxyTimeout: 180000,
            // 保持连接活跃
            headers: {
                'Connection': 'keep-alive',
                'Keep-Alive': 'timeout=180, max=1000'
            },
            onProxyReq: (proxyReq, req) => {
                console.log('代理请求:', req.method, req.path);
                // 确保流式请求的头部正确设置
                if (req.path.includes('/stream')) {
                    proxyReq.setHeader('Accept', 'text/event-stream');
                    proxyReq.setHeader('Cache-Control', 'no-cache');
                }
            },
            onProxyRes: (proxyRes, req) => {
                console.log('代理响应:', proxyRes.statusCode, req.method, req.path);
                // 对于流式响应，设置正确的头部
                if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                    console.log('检测到流式响应，设置SSE头部');
                    proxyRes.headers['Cache-Control'] = 'no-cache';
                    proxyRes.headers['Connection'] = 'keep-alive';
                    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
                    proxyRes.headers['Access-Control-Allow-Headers'] = 'Cache-Control';
                }
            },
            onError: (err, req, res) => {
                console.error('代理错误:', err);
            },
        })
    );
};