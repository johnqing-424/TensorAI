#!/bin/bash

# 停止脚本 - 停止前端和代理服务器
# 作者: TensorAI
# 功能: 停止由start-all.sh启动的所有服务
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

# 安全停止进程函数
safe_kill() {
    local pid=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if [ -z "$pid" ]; then
        log_warning "未提供有效的PID"
        return 1
    fi
    
    # 检查进程是否存在
    if ! kill -0 $pid 2>/dev/null; then
        log_warning "进程 $pid ($service_name) 不存在或已停止"
        return 1
    fi
    
    log_info "正在停止 $service_name (PID: $pid)..."
    
    # 首先尝试优雅停止 (SIGTERM)
    if kill -TERM $pid 2>/dev/null; then
        log_info "已发送 SIGTERM 信号给进程 $pid"
        
        # 等待进程停止
        local count=0
        while [ $count -lt $timeout ] && kill -0 $pid 2>/dev/null; do
            sleep 1
            count=$((count + 1))
            log_info "等待进程停止... ($count/$timeout)"
        done
        
        # 检查进程是否已停止
        if ! kill -0 $pid 2>/dev/null; then
            log_success "$service_name 已优雅停止"
            return 0
        else
            log_warning "进程 $pid 在 $timeout 秒后仍在运行，尝试强制停止..."
            # 强制停止 (SIGKILL)
            if kill -KILL $pid 2>/dev/null; then
                sleep 2
                if ! kill -0 $pid 2>/dev/null; then
                    log_success "$service_name 已强制停止"
                    return 0
                else
                    log_error "无法停止进程 $pid ($service_name)"
                    return 1
                fi
            else
                log_error "无法发送 SIGKILL 信号给进程 $pid"
                return 1
            fi
        fi
    else
        log_error "无法发送 SIGTERM 信号给进程 $pid"
        return 1
    fi
}

# 查找进程函数
find_processes() {
    local pattern=$1
    local service_name=$2
    
    log_info "查找 $service_name 进程..."
    local pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
    
    if [ -n "$pids" ]; then
        log_info "找到 $service_name 进程: $pids"
        echo "$pids"
    else
        log_info "未找到运行中的 $service_name 进程"
        echo ""
    fi
}

# 检查端口占用
check_port_usage() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port &> /dev/null; then
        local pid=$(lsof -ti :$port)
        log_warning "端口 $port 仍被占用 (PID: $pid) - $service_name 可能未完全停止"
        return 1
    else
        log_success "端口 $port 已释放"
        return 0
    fi
}

echo -e "${BLUE}=== TensorAI 聊天系统停止脚本 v2.0 ===${NC}"
log_info "开始停止所有服务..."
log_info "当前工作目录: $(pwd)"
log_info "当前用户: $(whoami)"
log_info "停止时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 创建日志目录（如果不存在）
mkdir -p logs

# 记录停止时间
echo "$(date '+%Y-%m-%d %H:%M:%S')" > logs/last_stop.txt

# 显示当前运行的相关进程
log_info "当前运行的相关进程:"
ps aux | grep -E "(node|react-scripts|cors-proxy)" | grep -v grep | while read line; do
    log_info "  $line"
done

# 显示端口占用情况
log_info "检查端口占用情况..."
for port in 3000 3001; do
    if lsof -i :$port &> /dev/null; then
        local pid=$(lsof -ti :$port)
        local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        log_info "端口 $port 被进程 $process (PID: $pid) 占用"
    else
        log_info "端口 $port 未被占用"
    fi
done

# 停止代理服务器
log_info "=== 停止代理服务器 ==="

# 首先检查PID文件
if [ -f .proxy.pid ]; then
    PROXY_PID=$(cat .proxy.pid)
    log_info "从PID文件读取到代理服务器PID: $PROXY_PID"
    
    if safe_kill $PROXY_PID "代理服务器"; then
        rm -f .proxy.pid
        log_success "代理服务器PID文件已删除"
    else
        log_warning "从PID文件停止代理服务器失败，尝试其他方法..."
        rm -f .proxy.pid
    fi
else
    log_info "未找到代理服务器PID文件 (.proxy.pid)"
fi

# 查找并停止所有代理服务器进程
PROXY_PIDS=$(find_processes "node.*cors-proxy.js" "代理服务器")
if [ -n "$PROXY_PIDS" ]; then
    for pid in $PROXY_PIDS; do
        safe_kill $pid "代理服务器"
    done
fi

# 查找并停止通过端口3001的进程
PORT_3001_PIDS=$(lsof -ti :3001 2>/dev/null || echo "")
if [ -n "$PORT_3001_PIDS" ]; then
    log_info "发现占用端口3001的进程: $PORT_3001_PIDS"
    for pid in $PORT_3001_PIDS; do
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        safe_kill $pid "端口3001进程($process_name)"
    done
fi

# 停止前端React应用
log_info "=== 停止前端应用 ==="

# 查找React应用进程
REACT_PIDS=$(find_processes "react-scripts start" "前端应用")
if [ -n "$REACT_PIDS" ]; then
    for pid in $REACT_PIDS; do
        safe_kill $pid "前端应用"
    done
fi

# 查找并停止npm run dev进程
NPM_DEV_PIDS=$(find_processes "npm.*run.*dev" "npm dev")
if [ -n "$NPM_DEV_PIDS" ]; then
    for pid in $NPM_DEV_PIDS; do
        safe_kill $pid "npm dev进程"
    done
fi

# 查找并停止concurrently进程
CONCURRENTLY_PIDS=$(find_processes "concurrently" "concurrently")
if [ -n "$CONCURRENTLY_PIDS" ]; then
    for pid in $CONCURRENTLY_PIDS; do
        safe_kill $pid "concurrently进程"
    done
fi

# 查找并停止通过端口3000的进程
PORT_3000_PIDS=$(lsof -ti :3000 2>/dev/null || echo "")
if [ -n "$PORT_3000_PIDS" ]; then
    log_info "发现占用端口3000的进程: $PORT_3000_PIDS"
    for pid in $PORT_3000_PIDS; do
        local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        safe_kill $pid "端口3000进程($process_name)"
    done
fi

# 最终检查
log_info "=== 最终检查 ==="

# 检查端口是否已释放
log_info "检查端口释放情况..."
check_port_usage 3000 "前端应用"
check_port_usage 3001 "代理服务器"

# 检查是否还有相关进程运行
log_info "检查剩余进程..."
remaining_processes=$(ps aux | grep -E "(react-scripts|cors-proxy|npm.*dev)" | grep -v grep | wc -l)
if [ $remaining_processes -gt 0 ]; then
    log_warning "仍有 $remaining_processes 个相关进程在运行:"
    ps aux | grep -E "(react-scripts|cors-proxy|npm.*dev)" | grep -v grep | while read line; do
        log_warning "  $line"
    done
else
    log_success "所有相关进程已停止"
fi

# 清理临时文件
log_info "清理临时文件..."
rm -f .proxy.pid 2>/dev/null || true
rm -f nohup.out 2>/dev/null || true
log_info "临时文件清理完成"

# 记录停止完成时间
echo "$(date '+%Y-%m-%d %H:%M:%S')" > logs/stop_completed.txt

log_success "所有服务停止操作完成 - $(date '+%Y-%m-%d %H:%M:%S')"
log_info "如需重新启动，请运行: ./start-all.sh"