#!/bin/bash
echo "更新生产环境..."

# 记录当前时间作为版本标识
BUILD_TIME=$(date +"%Y%m%d_%H%M%S")
BUILD_NAME="tensorai_build_${BUILD_TIME}"
ARCHIVE_PATH="../TensorAI-builds/${BUILD_NAME}.tar.gz"

echo "构建版本: ${BUILD_NAME}"

# 构建最新版本
npm run build

# 存档当前构建
echo "正在创建构建存档..."
tar -czf ${ARCHIVE_PATH} build/
echo "构建已存档至: ${ARCHIVE_PATH}"

# 复制到生产目录
echo "正在更新生产环境..."
sudo cp -r build/* /var/www/TensorAI/

echo "==================== 部署完成 ===================="
echo "生产环境已更新"
echo "访问地址: http://123.207.100.71:5006"
echo "构建存档: ${ARCHIVE_PATH}"
echo "可用于回档的命令:"
echo "sudo tar -xzf ${ARCHIVE_PATH} -C /tmp/ && sudo cp -r /tmp/build/* /var/www/tensorai/"
echo "==================================================" 