#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}                 TensorAI 聊天系统启动器${NC}"
echo -e "${BLUE}======================================================${NC}"
echo ""

# 检查后端是否在运行
check_backend() {
  echo -e "${YELLOW}检查后端服务...${NC}"
  if curl -s http://localhost:8080/api/login -o /dev/null; then
    echo -e "${GREEN}✓ 后端服务已运行${NC}"
    return 0
  else
    echo -e "${RED}✗ 后端服务未运行${NC}"
    return 1
  fi
}

# 启动后端
start_backend() {
  echo -e "${YELLOW}启动后端服务...${NC}"
  cd ../Tensor-AI
  if [ -f "target/tensor-ai.jar" ]; then
    java -jar target/tensor-ai.jar &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ 后端服务启动，PID: $BACKEND_PID${NC}"
  else
    echo -e "${YELLOW}编译后端服务...${NC}"
    ./mvnw clean package -DskipTests
    if [ $? -eq 0 ]; then
      java -jar target/tensor-ai.jar &
      BACKEND_PID=$!
      echo -e "${GREEN}✓ 后端服务启动，PID: $BACKEND_PID${NC}"
    else
      echo -e "${RED}✗ 后端编译失败，请检查错误${NC}"
      return 1
    fi
  fi
  cd ../ragflow-chat
}

# 启动前端
start_frontend() {
  echo -e "${YELLOW}启动前端服务...${NC}"
  echo -e "${BLUE}启动CORS代理服务器...${NC}"
  node cors-proxy.js &
  PROXY_PID=$!
  echo -e "${GREEN}✓ CORS代理服务器启动，PID: $PROXY_PID${NC}"
  
  echo -e "${BLUE}启动React开发服务器...${NC}"
  npm start &
  REACT_PID=$!
  echo -e "${GREEN}✓ React开发服务器启动，PID: $REACT_PID${NC}"
}

# 主流程
main() {
  # 检查后端是否已运行
  if ! check_backend; then
    start_backend
    # 等待后端启动
    echo -e "${YELLOW}等待后端服务启动...${NC}"
    sleep 10
  fi
  
  # 启动前端
  start_frontend
  
  # 打印访问信息
  echo ""
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${GREEN}TensorAI 聊天系统已启动!${NC}"
  echo -e "${YELLOW}前端访问地址: ${BLUE}http://localhost:3000${NC}"
  echo -e "${YELLOW}API接口地址: ${BLUE}http://localhost:8080/api${NC}"
  echo -e "${YELLOW}CORS代理地址: ${BLUE}http://localhost:3001/proxy${NC}"
  echo -e "${BLUE}======================================================${NC}"
  echo ""
  echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
  
  # 捕获Ctrl+C，清理进程
  trap 'echo -e "${RED}停止服务...${NC}"; kill $PROXY_PID $REACT_PID $BACKEND_PID 2>/dev/null; exit' SIGINT
  
  # 保持脚本运行
  wait
}

# 运行主流程
main 