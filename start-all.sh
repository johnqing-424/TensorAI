#!/bin/bash

# 一键启动脚本 - 同时启动前端和代理服务器
# 作者: TensorAI
# 功能: 启动前端React应用和CORS代理服务器
# 版本: 2.0 (增强调试版)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service_name=$2
    if lsof -i :$port &> /dev/null; then
        log_warning "端口 $port 已被占用，可能有其他 $service_name 实例正在运行"
        local pid=$(lsof -ti :$port)
        log_info "占用端口 $port 的进程 PID: $pid"
        return 1
    else
        log_info "端口 $port 可用"
        return 0
    fi
}

# 检查进程是否运行
check_process() {
    local process_name=$1
    local pid=$(ps aux | grep "$process_name" | grep -v grep | awk '{print $2}' | head -1)
    if [ -n "$pid" ]; then
        log_warning "发现运行中的 $process_name 进程 (PID: $pid)"
        return 1
    else
        log_info "未发现运行中的 $process_name 进程"
        return 0
    fi
}

echo -e "${BLUE}=== TensorAI 聊天系统一键启动脚本 v2.0 ===${NC}"
log_info "开始启动前端和代理服务器..."
log_info "当前工作目录: $(pwd)"
log_info "当前用户: $(whoami)"
log_info "系统信息: $(uname -a)"

# 检查系统环境
log_info "检查系统环境..."

# 检查Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js 已安装: $NODE_VERSION"
else
    log_error "未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm 已安装: $NPM_VERSION"
else
    log_error "未找到 npm，请先安装 npm"
    exit 1
fi

# 检查项目文件
log_info "检查项目文件..."
if [ -f "package.json" ]; then
    log_success "找到 package.json"
else
    log_error "未找到 package.json，请确保在正确的项目目录中运行此脚本"
    exit 1
fi

if [ -f "cors-proxy.js" ]; then
    log_success "找到 cors-proxy.js"
else
    log_error "未找到 cors-proxy.js，代理服务器可能无法启动"
fi

# 检查端口占用情况
log_info "检查端口占用情况..."
check_port 3000 "前端应用"
check_port 3001 "代理服务器"

# 检查现有进程
log_info "检查现有进程..."
check_process "react-scripts start"
check_process "node cors-proxy.js"

# 检查项目依赖
log_info "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    log_warning "未找到 node_modules 目录"
    log_info "正在安装项目依赖..."
    if npm install; then
        log_success "项目依赖安装完成"
    else
        log_error "项目依赖安装失败"
        exit 1
    fi
else
    log_success "找到 node_modules 目录"
fi

# 检查代理服务器依赖
log_info "检查代理服务器依赖..."
missing_deps=()
for dep in express cors node-fetch concurrently; do
    if ! npm list $dep &> /dev/null; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -gt 0 ]; then
    log_warning "缺少依赖: ${missing_deps[*]}"
    log_info "正在安装缺少的依赖..."
    if npm install ${missing_deps[*]}; then
        log_success "依赖安装完成"
    else
        log_error "依赖安装失败"
        exit 1
    fi
else
    log_success "所有必要依赖已安装"
fi

# 创建日志目录
log_info "创建日志目录..."
if mkdir -p logs; then
    log_success "日志目录创建成功: $(pwd)/logs"
else
    log_error "日志目录创建失败"
    exit 1
fi

# 清理旧的日志文件（保留最近7天）
log_info "清理旧日志文件..."
find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
log_info "日志清理完成"

# 创建启动时间戳文件
echo "$(date '+%Y-%m-%d %H:%M:%S')" > logs/last_start.txt

log_success "环境检查完成，准备启动服务..."
log_info "前端将在 http://localhost:3000 启动"
log_info "代理服务器将在 http://localhost:3001 启动"
log_info "日志文件位置: $(pwd)/logs/"
echo ""
log_warning "要停止所有服务，请按 Ctrl+C 或运行: ./stop-all.sh"
echo ""

# 设置信号处理
trap 'log_info "收到停止信号，正在清理..."; exit 0' INT TERM

# 启动服务
log_info "使用 npm run dev 启动服务..."
log_info "启动命令执行时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 使用concurrently同时启动前端和代理服务器
npm run dev

log_info "所有服务已停止 - $(date '+%Y-%m-%d %H:%M:%S')"