#!/bin/bash

# 一键启动脚本 - 同时启动前端和代理服务器
# 作者: TensorAI
# 功能: 在不同终端窗口中启动前端React应用和CORS代理服务器

echo "=== TensorAI 聊天系统一键启动脚本 ==="
echo "正在启动前端和代理服务器..."

# 检查是否安装了必要的依赖
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 检查是否安装了项目依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装项目依赖..."
    npm install
fi

# 检查是否安装了代理服务器依赖
if ! npm list express &> /dev/null; then
    echo "正在安装代理服务器依赖..."
    npm install express cors node-fetch
fi

# 创建日志目录
mkdir -p logs

# 启动代理服务器（后台运行）
echo "启动CORS代理服务器..."
nohup node cors-proxy.js > logs/proxy.log 2>&1 &
PROXY_PID=$!
echo "代理服务器已启动，PID: $PROXY_PID"

# 等待代理服务器启动
sleep 2

# 检查代理服务器是否成功启动
if ! curl -s http://localhost:3001/test > /dev/null; then
    echo "警告: 代理服务器可能未成功启动，请检查 logs/proxy.log"
else
    echo "代理服务器启动成功: http://localhost:3001"
fi

# 启动前端应用
echo "启动前端应用..."
echo "前端将在 http://localhost:3000 启动"
echo "代理服务器运行在 http://localhost:3001"
echo ""
echo "要停止所有服务，请按 Ctrl+C"
echo "或运行: ./stop-all.sh"
echo ""

# 保存PID到文件，方便后续停止
echo $PROXY_PID > .proxy.pid

# 启动前端（前台运行）
npm start

# 如果前端退出，清理代理服务器
echo "正在停止代理服务器..."
if [ -f .proxy.pid ]; then
    PROXY_PID=$(cat .proxy.pid)
    kill $PROXY_PID 2>/dev/null
    rm .proxy.pid
    echo "代理服务器已停止"
fi

echo "所有服务已停止"