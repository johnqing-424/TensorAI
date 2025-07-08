#!/bin/bash

echo "TensorAI 回滚工具 (有引用版本)"
echo "=============================="

# 存储构建的目录
BUILDS_DIR="../TensorAI-builds"

# 检查构建目录是否存在
if [ ! -d "$BUILDS_DIR" ]; then
    echo "错误: 构建目录不存在 ($BUILDS_DIR)"
    exit 1
fi

# 获取所有tensorai_withref开头的构建
builds=($(ls -1 $BUILDS_DIR/tensorai_withref_*.tar.gz 2>/dev/null))

# 检查是否有可用的构建
if [ ${#builds[@]} -eq 0 ]; then
    echo "错误: 未找到可用的有引用版本构建"
    exit 1
fi

# 显示可用的构建
echo "可用的有引用版本构建:"
echo ""

for i in "${!builds[@]}"; do
    build_name=$(basename "${builds[$i]}" .tar.gz)
    build_date=$(echo $build_name | sed 's/tensorai_withref_//')
    echo "[$i] $build_name (${build_date:0:8} ${build_date:9:2}:${build_date:11:2}:${build_date:13:2})"
done

echo ""
read -p "请选择要回滚到的版本 [0-$((${#builds[@]}-1))]: " selection

# 验证选择
if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 0 ] || [ "$selection" -ge "${#builds[@]}" ]; then
    echo "错误: 无效的选择"
    exit 1
fi

selected_build="${builds[$selection]}"
build_name=$(basename "$selected_build" .tar.gz)

echo ""
echo "您选择了回滚到: $build_name"
read -p "确认回滚? [y/N]: " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "已取消回滚"
    exit 0
fi

echo ""
echo "开始回滚..."

# 解压构建到临时目录
echo "正在解压构建..."
sudo tar -xzf "$selected_build" -C /tmp/

# 复制到生产目录
echo "正在更新生产环境..."
sudo cp -r /tmp/build/* /var/www/tensorai-withref/

# 清理
echo "正在清理临时文件..."
sudo rm -rf /tmp/build

echo ""
echo "回滚完成!"
echo "有引用版本已回滚到: $build_name"
echo "访问地址: http://192.168.1.131:3003" 