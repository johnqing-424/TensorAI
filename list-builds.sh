#!/bin/bash

echo "========== TensorAI 构建历史 =========="
echo "目录: ../TensorAI-builds/"
echo ""

if [ ! -d "../TensorAI-builds" ] || [ -z "$(ls -A ../TensorAI-builds/)" ]; then
    echo "暂无构建历史记录"
    exit 0
fi

# 计算历史记录总数
total=$(ls -1 ../TensorAI-builds/ | grep -c "tensorai_build_")
echo "共有 $total 个历史构建版本"
echo ""

# 按时间排序显示所有构建历史
echo "构建历史列表 (按时间排序):"
echo "========================================================================"
echo -e "编号\t版本标识\t\t大小\t\t构建时间"
echo "------------------------------------------------------------------------"

# 遍历并显示所有构建历史
count=1
for file in $(ls -t ../TensorAI-builds/ | grep "tensorai_build_"); do
    # 提取构建日期和时间
    build_date=$(echo $file | sed -E 's/tensorai_build_([0-9]{8})_([0-9]{6}).tar.gz/\1/')
    build_time=$(echo $file | sed -E 's/tensorai_build_([0-9]{8})_([0-9]{6}).tar.gz/\2/')
    
    # 格式化日期和时间
    formatted_date=$(echo $build_date | sed -E 's/([0-9]{4})([0-9]{2})([0-9]{2})/\1-\2-\3/')
    formatted_time=$(echo $build_time | sed -E 's/([0-9]{2})([0-9]{2})([0-9]{2})/\1:\2:\3/')
    
    # 获取文件大小
    file_size=$(du -h "../TensorAI-builds/$file" | cut -f1)
    
    # 输出记录
    echo -e "$count\t$file\t$file_size\t$formatted_date $formatted_time"
    count=$((count + 1))
done

echo "========================================================================"
echo ""
echo "使用方法:"
echo "- 查看历史构建: ./list-builds.sh"
echo "- 回档到历史版本: ./rollback.sh" 