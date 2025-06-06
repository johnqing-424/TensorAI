#!/bin/bash

# 停止脚本 - 停止前端和代理服务器
# 作者: TensorAI
# 功能: 停止由start-all.sh启动的所有服务

echo "=== TensorAI 聊天系统停止脚本 ==="

# 停止代理服务器
if [ -f .proxy.pid ]; then
    PROXY_PID=$(cat .proxy.pid)
    echo "正在停止代理服务器 (PID: $PROXY_PID)..."
    kill $PROXY_PID 2>/dev/null
    rm .proxy.pid
    echo "代理服务器已停止"
else
    echo "未找到代理服务器PID文件，尝试查找并停止进程..."
    # 尝试查找并停止代理服务器进程
    PROXY_PID=$(ps aux | grep "node cors-proxy.js" | grep -v grep | awk '{print $2}')
    if [ -n "$PROXY_PID" ]; then
        echo "找到代理服务器进程 (PID: $PROXY_PID)，正在停止..."
        kill $PROXY_PID 2>/dev/null
        echo "代理服务器已停止"
    else
        echo "未找到运行中的代理服务器进程"
    fi
fi

# 查找并停止前端React应用进程
REACT_PID=$(ps aux | grep "react-scripts start" | grep -v grep | awk '{print $2}')
if [ -n "$REACT_PID" ]; then
    echo "正在停止前端应用 (PID: $REACT_PID)..."
    kill $REACT_PID 2>/dev/null
    echo "前端应用已停止"
else
    echo "未找到运行中的前端应用进程"
fi

echo "所有服务已停止"