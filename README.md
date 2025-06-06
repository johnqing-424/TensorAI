# TensorAI 聊天系统

TensorAI是一个集成了RAGFlow能力的智能聊天系统，包含前端聊天界面和后端API服务。

## 系统架构

系统由两个主要部分组成：

1. **前端 (ragflow-chat)**
   - 基于React开发的聊天界面
   - 支持多会话管理
   - 流式响应的打字效果
   - 支持引用知识库来源显示

2. **后端 (Tensor-AI)**
   - 基于Spring Boot的Java后端
   - 对接RAGFlow API
   - 提供认证、会话管理和消息处理等功能

## 快速开始

### 使用一键启动脚本

```bash
# 进入项目目录
cd ragflow-chat

# 赋予启动脚本执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

### 手动启动

#### 启动后端

```bash
# 进入后端目录
cd Tensor-AI

# 编译后端
./mvnw clean package -DskipTests

# 运行后端
java -jar target/tensor-ai.jar
```

#### 启动前端

```bash
# 进入前端目录
cd ragflow-chat

# 安装依赖
npm install

# 启动CORS代理和前端开发服务器
npm run dev
```

## 登录系统

TensorAI使用手机号和验证码进行登录。系统中预置了以下测试账号：

| 手机号 | 验证码 | 说明 |
|-------|-------|-----|
| 13612345678 | token-zjts | 测试账号1 |
| 13712345678 | token-bruce | 测试账号2 |
| 13812345678 | token-yuehan | 测试账号3 |

## 目录结构

```
ragflow-chat/          # 前端项目
  ├── public/          # 静态资源
  ├── src/             # 源代码
  │   ├── api/         # API调用
  │   ├── components/  # UI组件
  │   ├── context/     # 状态管理
  │   ├── services/    # 服务层
  │   ├── types/       # 类型定义
  │   └── utils/       # 工具函数
  ├── cors-proxy.js    # CORS代理服务器
  └── start.sh         # 一键启动脚本

Tensor-AI/             # 后端项目
  ├── src/             # 源代码
  │   └── main/
  │       ├── java/    # Java代码
  │       └── resources/ # 资源文件
  └── pom.xml          # Maven配置
```

## 前后端通信

前后端通过HTTP API进行通信，主要接口包括：

- `/api/login` - 用户登录
- `/api/sessions` - 会话管理（获取/创建/更新/删除）
- `/api/messages` - 消息处理（获取/发送）
- `/api/messages/stream` - 流式消息处理

所有API请求需要在请求头中包含：
- `token`: 登录后获取的访问令牌
- `appid`: 应用ID，默认为"process"

## 开发指南

### 前端开发

```bash
# 安装依赖
cd ragflow-chat
npm install

# 启动开发服务器
npm run dev
```

### 后端开发

```bash
# 编译项目
cd Tensor-AI
./mvnw clean package

# 运行项目
java -jar target/tensor-ai.jar
```

### 配置说明

前端配置文件：`.env.local`
```
REACT_APP_API_BASE_URL=http://localhost:8080
```

后端配置文件：`application.yaml`
```yaml
ragflow:
  api:
    base-url: http://192.168.1.131:8080
  chat:
    id:
      process: xxxxxxxxxxxx  # 不同功能对应的Chat ID
      product: xxxxxxxxxxxx
      data: xxxxxxxxxxxx
```

## 注意事项

- 请确保启动前端前，后端服务已经运行
- 使用代理服务器解决CORS跨域问题
- 默认测试账号信息存储在`Tensor-AI/src/main/resources/user-config.csv`中

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
