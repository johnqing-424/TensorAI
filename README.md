# RAGFlow Chat

前端聊天界面用于RAGFlow系统。

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 启动开发服务器

有两种方式启动开发环境：

#### 1. 一键启动（推荐）

同时启动CORS代理和React开发服务器：

```bash
npm run dev
```

这个命令会同时启动：
- CORS代理服务器（在端口3001上）
- React开发服务器（在端口3000上）

#### 2. 分开启动

如果需要分别控制两个服务，可以在不同的终端中运行：

```bash
# 终端1：启动CORS代理
npm run start:proxy

# 终端2：启动React开发服务器
npm start
```

### 构建生产版本

```bash
npm run build
```

## 环境配置

如需修改API端点或其他配置，请编辑`.env.local`文件。

## 功能特点

- 📱 响应式UI设计，支持移动端和桌面端
- 🔑 API密钥认证
- 💬 流式响应的打字效果
- 📚 支持显示引用的知识库来源
- 📝 支持多会话管理
- 🤖 支持多个聊天助手选择

## 安装与运行

### 前置条件

- Node.js 14.0 或更高版本
- npm 或 yarn

### 配置环境变量

创建一个`.env.local`文件在项目根目录，并添加：

```
REACT_APP_API_BASE_URL=http://your-ragflow-api-url
```

将`your-ragflow-api-url`替换为您的RAGFlow API地址。

## 使用指南

1. 第一次访问应用时，您需要输入API密钥进行认证
2. 认证成功后，应用将加载可用的聊天助手列表
3. 选择一个聊天助手开始对话
4. 您可以创建新的会话或选择现有会话继续对话
5. 发送消息和查看回复
6. 查看引用面板了解回答的信息来源

## 技术栈

- React 19
- TypeScript 4
- Fetch API 用于网络请求
- CSS3 用于样式

## 项目结构

```
src/
  api/          - API调用相关
  components/   - UI组件
  context/      - 状态管理
  types/        - TypeScript类型定义
  utils/        - 工具函数
  App.tsx       - 主应用组件
```

## 注意事项

- 请确保您拥有有效的RAGFlow API密钥
- API密钥仅存储在浏览器的localStorage中，不会发送到除指定API外的任何地方

## 未来计划

- 添加黑暗模式支持
- 增加导出聊天历史功能
- 支持语音输入和文件上传
- 改进移动端体验
