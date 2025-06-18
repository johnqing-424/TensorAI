#!/bin/bash

# 直接启动脚本 - 只启动前端React应用（直接调用后端API）
# 作者: TensorAI
# 功能: 启动前端React应用，直接调用Tensor-AI后端API
# 版本: 1.0

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

# 检查Node.js和npm是否安装
check_dependencies() {
    log_info "检查依赖项..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    log_success "依赖项检查完成"
}

# 检查后端服务是否运行
check_backend() {
    log_info "检查Tensor-AI后端服务..."
    
    if curl -s http://192.168.1.131:8080/api/health > /dev/null 2>&1; then
        log_success "Tensor-AI后端服务正在运行"
    else
        log_warning "无法连接到Tensor-AI后端服务 (http://192.168.1.131:8080)"
        log_warning "请确保Tensor-AI后端服务已启动并配置了CORS"
        read -p "是否继续启动前端？(y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "用户取消启动"
            exit 0
        fi
    fi
}

# 安装依赖
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install
        if [ $? -ne 0 ]; then
            log_error "依赖安装失败"
            exit 1
        fi
        log_success "前端依赖安装完成"
    else
        log_info "依赖已存在，跳过安装"
    fi
}

# 启动前端应用
start_frontend() {
    log_info "启动前端React应用..."
    log_info "前端地址: http://localhost:3000"
    log_info "后端地址: http://192.168.1.131:8080"
    log_info "按 Ctrl+C 停止应用"
    
    # 设置环境变量
    export REACT_APP_API_BASE_URL="http://192.168.1.131:8080"
    
    # 启动React应用
    npm start
}

# 清理函数
cleanup() {
    log_info "正在停止应用..."
    log_success "应用已停止"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    log_info "=== RAGFlow Chat 直接启动脚本 ==="
    log_info "模式: 直接调用后端API（无代理）"
    
    # 检查依赖
    check_dependencies
    
    # 检查后端服务
    check_backend
    
    # 安装依赖
    install_dependencies
    
    # 启动前端
    start_frontend
}

# 运行主函数
main "$@"