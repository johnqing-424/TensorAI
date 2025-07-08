#!/bin/bash

# 显示可用的历史构建版本
echo "可用的历史构建版本:"
echo "======================================================================================"
ls -lt ../TensorAI-builds/ | grep "tensorai_build_" | awk '{print NR".\t"$9"\t"$6" "$7" "$8}'
echo "======================================================================================"

# 询问用户选择哪个版本进行回档
read -p "请输入要回档的版本编号 (输入0取消): " version_number

if [ "$version_number" = "0" ]; then
    echo "已取消回档操作"
    exit 0
fi

# 获取对应的文件名
selected_file=$(ls -t ../TensorAI-builds/ | grep "tensorai_build_" | sed -n "${version_number}p")

if [ -z "$selected_file" ]; then
    echo "无效的版本编号"
    exit 1
fi

archive_path="../TensorAI-builds/$selected_file"
echo "您选择的版本是: $selected_file"
read -p "确认回档到此版本? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "已取消回档操作"
    exit 0
fi

# 执行回档
echo "正在回档到版本: $selected_file ..."
sudo tar -xzf "$archive_path" -C /tmp/
sudo cp -r /tmp/build/* /var/www/tensorai/
echo "回档完成!"
echo "生产环境已更新到版本: $selected_file"
echo "访问地址: http://123.207.100.71:5006" 