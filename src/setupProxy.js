const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://192.168.1.131:8080',
            changeOrigin: true,
            logLevel: 'debug',
            onProxyReq: (proxyReq, req) => {
                console.log('代理请求:', req.method, req.path);
            },
            onProxyRes: (proxyRes, req) => {
                console.log('代理响应:', proxyRes.statusCode, req.method, req.path);
            },
            onError: (err, req, res) => {
                console.error('代理错误:', err);
            },
        })
    );
}; 