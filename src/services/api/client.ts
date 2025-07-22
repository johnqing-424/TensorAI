import { ApiResponse, ChatCompletion, ChatMessage, ChatSession, Reference, ReferenceChunk, StreamChatResponse } from '../../types';

// 添加从后端响应类型定义
interface SessionResponseDTO {
    chat_id: string;
    create_date: string;
    create_time: number;
    id: string;
    messages: MessageResponse[];
    name: string;
    update_date: string;
    update_time: number;
}

interface MessageResponse {
    role: string;
    content: string;
    reference?: string;
}

// 定义引用文档聚合类型
interface DocAgg {
    doc_id: string;
    doc_name: string;
    count: number;
    url?: string;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null;
    private appid: string | null = 'process'; // 默认应用ID
    private maxRetries: number = 2;
    private retryDelay: number = 2000;
    private connectionTimeout: number = 30000; // 从20秒增加到30秒
    private requestQueue: Map<string, number> = new Map();
    private isNetworkOnline: boolean = navigator.onLine;
    private errorCount: Map<string, number> = new Map();
    private lastConnectionTest: number = 0;
    private lastConnectionResult: boolean = false;
    private connectionTestInterval: number = 10000; // 10秒内不重复测试连接

    constructor() {
        // 从环境变量或localStorage获取API基础URL
        this.baseUrl = localStorage.getItem('ragflow_api_url') || '/api';
        this.token = localStorage.getItem('ragflow_api_key');
        this.appid = localStorage.getItem('ragflow_appid') || 'process'; // 默认appid为process

        console.log(`API客户端初始化: baseUrl=${this.baseUrl}, token=${this.token ? '已设置' : '未设置'}`);

        // 添加网络状态监听
        window.addEventListener('online', this.handleNetworkChange);
        window.addEventListener('offline', this.handleNetworkChange);
    }

    // 处理网络状态变化
    private handleNetworkChange = () => {
        this.isNetworkOnline = navigator.onLine;
        console.log(`网络状态变化: ${this.isNetworkOnline ? '在线' : '离线'}`);
    };

    // 设置API Token
    setApiKey(apiKey: string) {
        if (!apiKey) {
            console.error('尝试设置无效的API密钥');
            return false;
        }

        console.log(`设置API密钥: ${apiKey.substring(0, 8)}...`);
        this.token = apiKey;

        // 同时更新localStorage
        try {
            localStorage.setItem('ragflow_api_key', apiKey);
            console.log('API密钥已保存到localStorage');
            return true;
        } catch (error) {
            console.error('保存API密钥到localStorage失败:', error);
            return false;
        }
    }

    // 设置应用ID
    setAppId(appid: string) {
        this.appid = appid;
        if (appid) {
            localStorage.setItem('ragflow_appid', appid);
        } else {
            localStorage.removeItem('ragflow_appid');
        }
    }

    // 获取API密钥
    getApiKey(): string | null {
        if (!this.token) {
            // 从localStorage尝试获取
            this.token = localStorage.getItem('ragflow_api_key');
            if (this.token) {
                console.log(`从localStorage中恢复API密钥: ${this.token.substring(0, 8)}...`);
            }
        }
        return this.token;
    }

    // 获取应用ID
    getAppId(): string | null {
        return this.appid || localStorage.getItem('ragflow_appid') || 'process';
    }

    // 清除API密钥
    clearApiKey() {
        console.log('清除API密钥');
        this.token = null;
        localStorage.removeItem('ragflow_api_key');
    }

    // 延迟函数
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 请求节流函数
    private async throttleRequest(endpoint: string): Promise<void> {
        const key = `${this.baseUrl}${endpoint}`;
        const now = Date.now();
        const lastRequest = this.requestQueue.get(key) || 0;

        // 确保两次请求之间至少间隔1.5秒
        const minInterval = 1500;
        const elapsed = now - lastRequest;

        if (elapsed < minInterval) {
            // 需要等待的时间
            const waitTime = minInterval - elapsed;
            await this.delay(waitTime);
        }

        // 更新最后请求时间
        this.requestQueue.set(key, Date.now());
    }

    // 检查网络状态
    private checkNetworkStatus(): boolean {
        if (!this.isNetworkOnline) {
            console.error('网络连接不可用');
            return false;
        }
        return true;
    }

    // 基础请求方法，带重试机制和节流控制
    private async request<T>(
        endpoint: string,
        method: string = 'GET',
        body?: any,
        headers: Record<string, string> = {}
    ): Promise<ApiResponse<T>> {
        // 检查网络状态
        if (!this.checkNetworkStatus()) {
            return {
                code: -1,
                message: "网络连接不可用，请检查您的网络连接后重试。"
            };
        }

        // 检查token是否存在
        if (!this.token) {
            console.error('API请求失败: 未提供token');
            return {
                code: 401,
                message: "未认证，请先登录"
            };
        }

        // 节流请求，防止短时间内大量相同请求
        await this.throttleRequest(endpoint);

        // 获取当前的appid (从localStorage或实例变量)
        const currentAppId = this.getAppId() || 'process';

        // 构建请求头
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': this.token,
            'appid': currentAppId
        };

        // 添加其他自定义请求头
        Object.assign(requestHeaders, headers);

        // 打印请求信息以便调试
        console.log(`API请求: ${method} ${endpoint}`);
        console.log(`请求头: token=${this.token.substring(0, 5)}..., appid=${currentAppId}`);

        // 构建请求URL，确保API路径正确
        const apiEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${apiEndpoint}`;

        try {
            // 发送请求
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined,
                cache: 'no-store'
            });

            console.log(`收到响应: ${response.status} ${response.statusText}`);

            // 检查HTTP状态码
            if (!response.ok) {
                // 服务器返回错误状态码
                let errorMessage = `HTTP错误 ${response.status}`;
                let errorResponse: any = {};

                try {
                    errorResponse = await response.json();
                    errorMessage = errorResponse.message || errorMessage;
                } catch (e) {
                    // 无法解析JSON，使用默认错误消息
                }

                return {
                    code: response.status,
                    message: errorMessage,
                    error: errorResponse
                };
            }

            // 解析JSON响应
            const data = await response.json();
            return data as ApiResponse<T>;
        } catch (error) {
            // 处理网络错误或解析错误
            console.error('API请求异常:', error);
            return {
                code: -1,
                message: `请求失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 用户登录方法
     * @param mobile 手机号
     * @param code 验证码
     * @param useDirect 是否直接调用（跳过代理）
     * @returns 登录结果
     */
    async login(mobile: string, code: string, useDirect = false) {
        try {
            // 注意：cors-proxy.js 中对登录路径有特殊处理，不需要 /api 前缀
            const loginEndpoint = "/login";
            const url = `${this.baseUrl}${loginEndpoint}`;

            console.log('发送登录请求:', {
                url,
                mobile,
                code
            });

            // 直接发送请求，不通过 request 方法以避免 token 检查
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    mobile,
                    code
                }),
                cache: 'no-store'
            });

            console.log('登录响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('登录请求失败:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            console.log('登录响应数据:', result);

            if (result.code === 0 && result.data) {
                // 登录成功，保存token
                this.setApiKey(result.data);
                return {
                    code: 0,
                    message: "登录成功",
                    data: result.data
                };
            } else {
                // 登录失败
                return {
                    code: result.code || 1,
                    message: result.message || "登录失败，请检查手机号和验证码"
                };
            }
        } catch (error) {
            console.error('登录异常:', error);
            return {
                code: -1,
                message: `登录异常: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    // 获取会话列表
    async listChatSessions() {
        return this.request<ChatSession[]>('/sessions', 'GET');
    }

    // 创建聊天会话
    async createChatSession(name: string = '新会话') {
        return this.request<SessionResponseDTO>('/sessions', 'POST', { name });
    }

    // 更新会话名称
    async updateSessionName(sessionId: string, name: string) {
        return this.request<void>('/sessions/update', 'PUT', {
            sessionId,
            name
        });
    }

    // 删除会话
    async deleteSession(sessionIds: string[]) {
        return this.request<void>('/sessions', 'DELETE', { ids: sessionIds });
    }

    // 获取消息记录
    async getMessages(sessionId: string) {
        // 确保使用最新的appid
        const currentAppId = this.getAppId();
        console.log(`使用appid: ${currentAppId} 发送请求: /messages?sessionId=${sessionId}`);

        return this.request<MessageResponse[]>(`/messages?sessionId=${sessionId}`, 'GET');
    }

    /**
     * 更新或保存单条消息 (withref)
     * @param message 要保存的消息对象
     * @returns 保存结果
     */
    async updateMessage(message: ChatMessage): Promise<ApiResponse<any>> {
        if (!message || !message.id) {
            console.error('更新消息失败: 提供了无效的消息对象');
            return {
                code: -1,
                message: '无效的消息对象，缺少ID'
            };
        }
        // 后端 PUT /api/messages 接口需要一个包含 message_id 和其他字段的对象
        const payload = {
            message_id: message.id,
            ...message
        };
        return this.request<any>('/messages', 'PUT', payload);
    }

    // 发送聊天消息（非流式）
    async sendChatMessage(
        sessionId: string,
        message: string
    ): Promise<ApiResponse<ChatCompletion>> {
        return this.request<ChatCompletion>('/messages', 'POST', {
            sessionId,
            message
        });
    }

    // 发送聊天消息（流式）
    async streamChatMessage(
        sessionId: string,
        message: string,
        onChunkReceived: (chunk: ApiResponse<StreamChatResponse>) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!this.token) {
            onError(new Error("未提供认证信息"));
            return;
        }

        const currentAppId = this.getAppId();
        const url = `${this.baseUrl}/messages/stream`;
        const requestBody = { sessionId, message };
        const headers = {
            'Content-Type': 'application/json',
            'token': this.token,
            'appid': currentAppId || 'process',
            'Accept': 'text/event-stream'
        };

        if (process.env.NODE_ENV === 'development') {
            console.log(`使用appid: ${currentAppId || 'process'} 发送流式请求`);
        }

        let accumulatedReference: Reference | null = null;
        let retryCount = 0;
        const maxRetries = 2; // 最多重试2次

        // 创建请求超时控制器
        const timeoutController = new AbortController();
        const signal = timeoutController.signal;

        // 设置60秒超时，显著提高超时时间，解决多轮对话问题
        const timeoutId = setTimeout(() => {
            console.warn('请求超时，自动中止');
            timeoutController.abort();
        }, 60000); // 60秒超时

        const executeStreamRequest = async (): Promise<void> => {
            let isCompleted = false; // 添加标志位，防止重复调用onComplete

            // 封装一个只调用一次的 onComplete
            const completeOnce = () => {
                if (!isCompleted) {
                    onComplete();
                    isCompleted = true;
                }
            };

            try {
                if (retryCount > 0) {
                    console.log(`尝试第${retryCount}次重试...`);
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                    signal: signal
                });

                clearTimeout(timeoutId); // 请求有响应后，清除超时计时器

                if (!response.ok) {
                    // 如果状态码表示服务器错误且还有重试次数，则重试
                    if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
                        retryCount++;
                        const delay = retryCount * 2000; // 重试延迟递增
                        console.log(`服务器错误(${response.status})，${delay}ms后重试...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return executeStreamRequest(); // 递归重试
                    }
                    throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error("无法获取响应读取器");
                }

                try {
                    const decoder = new TextDecoder("utf-8");
                    let buffer = '';

                    const processChunk = (text: string): ApiResponse<StreamChatResponse> | null => {
                        try {
                            // 处理SSE特殊事件
                            if (text.startsWith('id:') || text.startsWith('retry:') || text.startsWith('event:')) {
                                if (process.env.NODE_ENV === 'development') {
                                    console.log("接收到SSE控制消息:", text);
                                }
                                return null; // 这些是SSE控制消息，不是JSON数据
                            }

                            // 处理JSON数据
                            const json = JSON.parse(text);
                            return json as ApiResponse<StreamChatResponse>;
                        } catch (e) {
                            if (process.env.NODE_ENV === 'development') {
                                console.error("解析SSE数据块失败:", text, e);
                            }
                            return null;
                        }
                    };

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            if (buffer.trim()) {
                                const line = buffer.replace(/^data: ?/, '').trim();
                                if (line) {
                                    const chunk = processChunk(line);
                                    if (chunk) onChunkReceived(chunk);
                                }
                            }
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmedLine = line.replace(/^data: ?/, '').trim();
                            if (!trimmedLine) continue;

                            if (trimmedLine.includes('[DONE]')) {
                                console.log("接收到[DONE]信号, 准备完成");
                                completeOnce();
                                break;
                            }

                            // 增加对 event:complete 的处理
                            if (trimmedLine.includes("event:complete")) {
                                console.log("接收到 event:complete 信号, 准备完成");
                                completeOnce();
                                continue;
                            }

                            const chunk = processChunk(trimmedLine);
                            if (chunk && chunk.data) {
                                if (chunk.data.reference) {
                                    const newRef = chunk.data.reference;

                                    if (!accumulatedReference) {
                                        accumulatedReference = { chunks: [], doc_aggs: [], total: 0 };
                                    }

                                    const currentReference = accumulatedReference;

                                    if (newRef.chunks && Array.isArray(newRef.chunks)) {
                                        const chunkIds = new Set(currentReference.chunks.map(c => c.id));
                                        newRef.chunks.forEach(newChunk => {
                                            if (newChunk && newChunk.id && !chunkIds.has(newChunk.id)) {
                                                currentReference.chunks.push(newChunk);
                                                chunkIds.add(newChunk.id);
                                            }
                                        });
                                    }

                                    if (newRef.doc_aggs && Array.isArray(newRef.doc_aggs)) {
                                        const docIds = new Set(currentReference.doc_aggs.map(d => d.doc_id));
                                        newRef.doc_aggs.forEach(newDoc => {
                                            if (newDoc && newDoc.doc_id && !docIds.has(newDoc.doc_id)) {
                                                currentReference.doc_aggs.push(newDoc);
                                                docIds.add(newDoc.doc_id);
                                            }
                                        });
                                    }

                                    if (typeof newRef.total === 'number' && newRef.total > currentReference.total) {
                                        currentReference.total = newRef.total;
                                    }
                                }

                                const chunkToSend = {
                                    ...chunk,
                                    data: {
                                        ...chunk.data,
                                        answer: chunk.data.answer || '',
                                        reference: accumulatedReference || undefined,
                                    },
                                };

                                // 减少日志输出频率，只在有引用数据时才输出
                                if (process.env.NODE_ENV === 'development' &&
                                    accumulatedReference &&
                                    (accumulatedReference.chunks.length > 0 || accumulatedReference.doc_aggs.length > 0)) {
                                    console.log('累积的reference数据:', JSON.stringify({
                                        total: accumulatedReference.total,
                                        chunks_count: accumulatedReference.chunks.length,
                                        doc_aggs_count: accumulatedReference.doc_aggs.length
                                    }));
                                }

                                onChunkReceived(chunkToSend);
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }

                completeOnce(); // 确保在循环正常结束后也被调用
            } catch (error: any) {
                clearTimeout(timeoutId); // 确保出错时也清除计时器

                // 对于网络错误或超时，尝试重试
                if ((error.name === 'AbortError' || error.name === 'TypeError' ||
                    (error.message && error.message.includes('network'))) &&
                    retryCount < maxRetries) {
                    retryCount++;
                    const delay = retryCount * 2000; // 重试延迟递增
                    console.log(`网络错误或超时，${delay}ms后重试...`, error);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return executeStreamRequest(); // 递归重试
                } else {
                    console.error("流式聊天请求失败:", error);
                    // 生成更友好的错误信息
                    let errorMessage = "请求失败";
                    if (error.name === 'AbortError') {
                        errorMessage = "请求超时，请稍后再试";
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    onError(new Error(errorMessage));
                }
            } finally {
                completeOnce(); // 确保无论如何（即使有未捕获的异常）都能调用
            }
        };

        // 执行请求
        await executeStreamRequest();
    }

    // 健康检查和测试连接方法
    async testConnection(): Promise<boolean> {
        const now = Date.now();

        // 如果距离上次连接测试不到设定的间隔时间，直接返回缓存结果
        if (now - this.lastConnectionTest < this.connectionTestInterval) {
            console.log(`API连接测试缓存结果: ${this.lastConnectionResult ? '成功' : '失败'} (缓存 ${Math.round((now - this.lastConnectionTest) / 1000)}秒)`);
            return this.lastConnectionResult;
        }

        console.log(`测试API连接... URL: ${this.baseUrl}/api/sessions`);
        this.lastConnectionTest = now;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('连接测试超时，正在中止请求');
                controller.abort();
            }, 25000); // 25秒超时

            // 准备请求头
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            };

            // 只有当token存在时才添加到请求头
            if (this.token) {
                headers['token'] = this.token;
            }

            // 只有当appid存在时才添加到请求头
            if (this.appid) {
                headers['appid'] = this.appid;
            }

            // 尝试发送一个POST请求到API端点，不用HEAD方法
            console.log('正在尝试连接到API服务器...');
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                signal: controller.signal,
                headers,
                mode: 'cors',
                body: JSON.stringify({ mobile: '10000000000', code: '123456' }),
                credentials: 'same-origin'
            });

            clearTimeout(timeoutId);

            if (response.status !== 404) {
                console.log('API连接测试成功');
                this.lastConnectionResult = true;
                return true;
            } else {
                console.error(`API连接测试失败: HTTP ${response.status} (${response.statusText})`);
                this.lastConnectionResult = false;
                return false;
            }
        } catch (error) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                console.error('API连接测试超时');
            } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                console.error(`API连接失败: 无法连接到 ${this.baseUrl} (服务器可能未运行或URL不正确)`);
            } else {
                console.error('API连接测试出错:', error);
            }
            this.lastConnectionResult = false;
            return false;
        }
    }

    // 设置API地址
    setBaseUrl(url: string) {
        if (url && url.trim() !== '') {
            this.baseUrl = url;
            localStorage.setItem('ragflow_api_url', url);
            console.log(`API基础URL已更新: ${url}`);
            return true;
        }
        return false;
    }

    // 发送短信验证码
    async sendVerificationCode(mobile: string) {
        try {
            console.log(`尝试发送验证码到: ${mobile.substring(0, 3)}****${mobile.substring(mobile.length - 4)}`);

            // 创建特殊请求，不需要token验证
            // 根据登录API测试，应该使用/api前缀
            const apiUrl = this.baseUrl; // 使用当前配置的API地址
            const url = `${apiUrl}/api/sendCode`;

            const headers = {
                'Content-Type': 'application/json',
                'appid': this.appid || 'process',
                // 添加CORS相关请求头
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'POST',
            };

            console.log('发送验证码请求:', url);
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mobile }),
                // 重要：允许跨域请求携带凭证
                mode: 'cors',
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText || response.statusText };
                }

                return {
                    code: response.status,
                    message: errorData.message || `请求失败：${response.statusText}`,
                };
            }

            const data = await response.json();
            console.log('验证码发送响应:', data);
            return data;
        } catch (error) {
            console.error('API客户端: 发送验证码失败', error);
            return {
                code: 500,
                message: `发送验证码失败: ${(error as Error).message || '未知错误'}`
            };
        }
    }

    // 直接测试API连接
    async testDirectApi() {
        try {
            console.log('尝试直接测试API连接...');

            // 使用完整的URL测试，绕过可能的代理问题
            const directUrl = 'http://192.168.1.131:8080/api/sessions';
            console.log(`测试URL: ${directUrl}`);

            const response = await fetch(directUrl, {
                method: 'HEAD',
                headers: {
                    'Cache-Control': 'no-cache',
                    'appid': this.appid || 'process'
                }
            });

            console.log(`直接API测试响应: ${response.status} ${response.statusText}`);
            return response.ok;
        } catch (error) {
            console.error('直接API测试失败:', error);
            return false;
        }
    }
}

// 创建API客户端实例
const apiClient = new ApiClient();

// 导出默认实例和类
export default apiClient;
export { ApiClient };