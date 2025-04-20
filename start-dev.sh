#!/bin/bash

# 获取脚本所在的目录 (即项目根目录)
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# 切换到项目根目录，如果失败则退出
cd "$SCRIPT_DIR" || exit

echo "-----------------------------------------------------"
echo "尝试启动 asian-guide-web 后端 (开发模式)..."
echo "项目目录: $(pwd)"
echo "确保 .env 文件已配置好数据库连接等信息。"
echo "使用 'npm run dev' 命令 (需要 nodemon)。"
echo "按 Ctrl+C 停止服务器。"
echo "-----------------------------------------------------"
echo ""

# 执行 package.json 中定义的 dev 脚本
# nodemon 会监视文件变化并自动重启服务
npm run dev
