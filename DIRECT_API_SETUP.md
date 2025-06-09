# RAGFlow Chat 直接API调用配置说明

## 概述

本文档说明如何配置 RAGFlow Chat 直接调用 Tensor-AI 后端 API，无需通过代理服务器。

## 修改内容

### 1. API 客户端配置修改

已修改以下文件中的 API 基础地址：

- `src/services/api/client.ts`: 将 baseUrl 从 `http://localhost:3001/proxy` 改为 `http://localhost:8080/api`
- `src/api/client.ts`: 将生产环境默认地址改为 `http://localhost:8080`

### 2. 新增启动脚本

创建了新的启动脚本 `start-direct.sh`，只启动前端应用，不启动代理服务器。

## 使用方法

### 方式一：使用新的启动脚本（推荐）

```bash
# 使用新的直接调用启动脚本
./start-direct.sh
```

### 方式二：手动启动

```bash
# 只启动前端应用
npm start
```

## 前提条件

### 1. Tensor-AI 后端必须配置 CORS

后端需要允许来自 `http://localhost:3000` 的跨域请求。在 Tensor-AI 后端添加以下 CORS 配置：

```python
# 示例：Flask 应用的 CORS 配置
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'], 
     allow_headers=['Content-Type', 'Authorization', 'token', 'appid'],
     supports_credentials=True)
```

### 2. 确保 Tensor-AI 后端运行在 8080 端口

确认 Tensor-AI 后端服务运行在 `http://localhost:8080`。

## 优势

1. **性能提升**：去除代理层，减少网络延迟
2. **简化架构**：减少中间件，降低系统复杂度
3. **问题根源解决**：避免代理层对流式数据的干扰
4. **更好的流式体验**：直接接收后端的流式响应

## 故障排除

### 1. CORS 错误

如果遇到 CORS 错误，请确保：
- Tensor-AI 后端已正确配置 CORS
- 允许的源包含 `http://localhost:3000`
- 允许的请求头包含 `token` 和 `appid`

### 2. 连接失败

如果无法连接到后端：
- 确认 Tensor-AI 后端运行在 `http://localhost:8080`
- 检查防火墙设置
- 确认后端服务正常运行

### 3. 认证问题

如果遇到认证问题：
- 确认 token 和 appid 设置正确
- 检查后端是否正确处理这些认证头

## 回退方案

如果需要回退到使用代理服务器：

1. 恢复 API 客户端配置：
   ```typescript
   // 在 src/services/api/client.ts 中
   this.baseUrl = localStorage.getItem('ragflow_api_url') || 'http://localhost:3001/proxy';
   ```

2. 使用原来的启动脚本：
   ```bash
   ./start-all.sh
   ```

## 注意事项

1. 确保在修改前备份原始配置
2. 如果使用不同的端口，请相应修改配置
3. 生产环境部署时，请更新相应的 API 地址